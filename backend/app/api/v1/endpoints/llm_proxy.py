from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import base64

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import settings
from app.api import deps
from app.models.user import User
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.crud import crud_llm_limits

router = APIRouter()


class LLMProxyRequest(BaseModel):
    content: str
    schemas: Optional[List[str]] = None
    step: str
    schema_name: Optional[str] = None
    extra: Optional[dict] = None


class LLMProxyResponse(BaseModel):
    llm_output: str


class LukaLibreLLMService:
    def __init__(self):
        self.primary_text_llm = None
        self.primary_image_llm = None
        self.fallback_text_llm = None
        self.fallback_image_llm = None
        
        # Initialize primary LLM providers
        if settings.DEFAULT_LLM_PROVIDER == "openrouter" and settings.OPENROUTER_API_KEY:
            self.primary_text_llm = ChatOpenAI(
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base=settings.OPENROUTER_BASE_URL,
                model=settings.TEXT_MODEL,
                temperature=0.1,
                max_tokens=2048,
            )
            self.primary_image_llm = ChatOpenAI(
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base=settings.OPENROUTER_BASE_URL,
                model=settings.IMAGE_MODEL,
                temperature=0.1,
                max_tokens=2048,
            )
        elif settings.DEFAULT_LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
            self.primary_text_llm = ChatOpenAI(
                openai_api_key=settings.OPENAI_API_KEY,
                model=settings.TEXT_MODEL,
                temperature=0.1,
                max_tokens=2048,
            )
            self.primary_image_llm = ChatOpenAI(
                openai_api_key=settings.OPENAI_API_KEY,
                model=settings.IMAGE_MODEL,
                temperature=0.1,
                max_tokens=2048,
            )
        
        # Initialize fallback LLM providers
        if settings.FALLBACK_LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
            self.fallback_text_llm = ChatOpenAI(
                openai_api_key=settings.OPENAI_API_KEY,
                model=settings.FALLBACK_TEXT_MODEL,
                temperature=0.1,
                max_tokens=2048,
            )
            self.fallback_image_llm = ChatOpenAI(
                openai_api_key=settings.OPENAI_API_KEY,
                model=settings.FALLBACK_IMAGE_MODEL,
                temperature=0.1,
                max_tokens=2048,
            )
        elif settings.FALLBACK_LLM_PROVIDER == "openrouter" and settings.OPENROUTER_API_KEY:
            self.fallback_text_llm = ChatOpenAI(
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base=settings.OPENROUTER_BASE_URL,
                model=settings.FALLBACK_TEXT_MODEL,
                temperature=0.1,
                max_tokens=2048,
            )
            self.fallback_image_llm = ChatOpenAI(
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base=settings.OPENROUTER_BASE_URL,
                model=settings.FALLBACK_IMAGE_MODEL,
                temperature=0.1,
                max_tokens=2048,
            )
        
        if not any([self.primary_text_llm, self.primary_image_llm, self.fallback_text_llm, self.fallback_image_llm]):
            raise ValueError("No LLM provider configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY")
    
    async def _call_llm_with_fallback(self, messages, has_images=False):
        """Call LLM with automatic fallback on failure"""
        primary_llm = self.primary_image_llm if has_images else self.primary_text_llm
        fallback_llm = self.fallback_image_llm if has_images else self.fallback_text_llm
        model_type = "image" if has_images else "text"
        
        try:
            if primary_llm:
                print(f"Using primary {model_type} LLM provider: {settings.DEFAULT_LLM_PROVIDER}")
                return await primary_llm.ainvoke(messages)
        except Exception as e:
            print(f"Primary {model_type} LLM failed: {e}")
            
        if fallback_llm:
            try:
                print(f"Using fallback {model_type} LLM provider: {settings.FALLBACK_LLM_PROVIDER}")
                return await fallback_llm.ainvoke(messages)
            except Exception as e:
                print(f"Fallback {model_type} LLM also failed: {e}")
                raise e
        
        raise ValueError(f"All {model_type} LLM providers failed")
    
    async def process_json_request(self, request: LLMProxyRequest) -> str:
        """Process JSON request with step-based prompts"""
        messages = []
        
        if request.step == "identify_schema":
            schemas_str = f"\nOpciones: {', '.join(request.schemas)}" if request.schemas else ""
            system_prompt = (
                "Eres un asistente experto en clasificación de documentos. "
                "Dado el siguiente contenido y la lista de esquemas, responde solo con el nombre del esquema más adecuado."
                + schemas_str
            )
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=request.content)
            ]
        
        elif request.step == "generate_sql_json":
            system_prompt = (
                "Eres un experto en extracción de datos. Dado el siguiente contenido, genera:\n"
                "- Los comandos SQL INSERT para poblar todas las tablas relevantes del esquema en SQLite.\n"
                "- El JSON correspondiente siguiendo el schema.\n"
                "Responde en formato JSON así: {'sql_inserts': '...', 'json_data': {...}}"
            )
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=request.content)
            ]
        
        else:
            messages = [HumanMessage(content=request.content)]
        
        response = await self._call_llm_with_fallback(messages, has_images=False)
        return response.content
    
    async def process_multipart_request(self, prompt: str, files: List[UploadFile]) -> str:
        """Process multipart request with files"""
        # Build message content
        content_parts = [{"type": "text", "text": prompt}]
        
        if files:
            for file in files:
                file_content = await file.read()
                mime_type = file.content_type or "application/octet-stream"
                
                if mime_type.startswith("image/"):
                    b64_content = base64.b64encode(file_content).decode()
                    data_url = f"data:{mime_type};base64,{b64_content}"
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": data_url}
                    })
                else:
                    # For non-image files, include basic info in text
                    content_parts[0]["text"] += f"\n\n[Archivo adjunto: {file.filename}, tipo: {mime_type}]"
        
        # Detect if request has images
        has_images = any(file.content_type and file.content_type.startswith("image/") for file in files) if files else False
        
        # Create human message with content parts
        message = HumanMessage(content=content_parts if len(content_parts) > 1 else prompt)
        response = await self._call_llm_with_fallback([message], has_images=has_images)
        return response.content


# Initialize service
llm_service = LukaLibreLLMService()


@router.post("/proxy")
async def llm_proxy(
    request: Request,
    prompt: str = Form(None),
    files: List[UploadFile] = File(None),
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
) -> JSONResponse:
    """
    LLM Proxy endpoint - simplified LangChain implementation
    Supports both JSON and multipart/form-data requests
    """
    
    # Developer access control
    is_developer = (
        getattr(current_user, "is_developer", False) and 
        getattr(current_user, "dev_plan_active", False)
    )
    
    # Plan and credits check for non-developers
    if not is_developer:
        from app.crud import crud_user_plan
        plan = crud_user_plan.get_active_plan(db, current_user.id)
        if not plan or not plan.is_active:
            raise HTTPException(
                status_code=403,
                detail="No tienes un plan activo para usar el proxy LLM."
            )
        if plan.credits <= 0:
            raise HTTPException(
                status_code=402,
                detail="No tienes créditos suficientes para usar el proxy LLM."
            )
    
    # Rate limiting for non-developers
    if not is_developer:
        key, limit = crud_llm_limits.check_llm_limits(db, current_user.id)
        if key is not None:
            raise HTTPException(
                status_code=429, 
                detail=f"Límite de uso excedido ({key}: {limit})"
            )
    
    # Log request and consume credits
    crud_llm_limits.log_llm_request(db, current_user.id)
    if not is_developer:
        crud_user_plan.consume_credit(db, current_user.id)
    
    try:
        content_type = request.headers.get("content-type", "")
        
        if content_type.startswith("application/json"):
            # Handle JSON request
            body = await request.json()
            llm_request = LLMProxyRequest(**body)
            llm_output = await llm_service.process_json_request(llm_request)
        
        else:
            # Handle multipart/form-data request
            if not prompt:
                raise HTTPException(status_code=400, detail="Missing prompt field.")
            
            llm_output = await llm_service.process_multipart_request(prompt, files or [])
        
        return JSONResponse(content={"llm_output": llm_output})
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing LLM request: {str(e)}")