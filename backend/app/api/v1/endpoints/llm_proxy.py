from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import openai
from app.core.config import settings

router = APIRouter()

OPENAI_API_KEY = settings.OPENAI_API_KEY
OPENAI_MODEL = settings.OPENAI_MODEL

class LLMProxyRequest(BaseModel):
    content: str  # Texto plano extraído del archivo o pegado
    schemas: Optional[List[str]] = None  # Lista de nombres de schemas disponibles
    step: str  # 'identify_schema' o 'generate_sql_json'
    schema_name: Optional[str] = None  # Solo para 'generate_sql_json'
    extra: Optional[dict] = None

class LLMProxyResponse(BaseModel):
    schema_name: Optional[str] = None
    sql_inserts: Optional[str] = None
    json_data: Optional[dict] = None
    llm_output: Optional[str] = None

import aiofiles
from fastapi import UploadFile
import tempfile

import base64

async def call_openai(messages):
    client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=messages,
        max_tokens=2048,
        temperature=0.1,
    )
    return response.choices[0].message.content

from fastapi import Depends, Header
from app.api import deps
from app.models.user import User

from fastapi import Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.crud import crud_llm_limits

from fastapi import UploadFile, File, Form

from fastapi import UploadFile, File, Form
from typing import List

from fastapi import Request

@router.post("/proxy")
async def llm_proxy(
    request: Request,
    prompt: str = Form(None),
    files: List[UploadFile] = File(None),
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    # --- Chequeo de plan y créditos ---
    # Primero, verificar si el usuario es desarrollador con plan activo
    if getattr(current_user, "is_developer", False) and getattr(current_user, "dev_plan_active", False):
        # Los desarrolladores tienen acceso ilimitado al proxy LLM
        pass
    else:
        # Para usuarios normales, verificar plan y créditos en la tabla user_plans
        from app.crud import crud_user_plan
        plan = crud_user_plan.get_active_plan(db, current_user.id)
        if not plan or not plan.is_active:
            raise HTTPException(status_code=403, detail="No tienes un plan activo para usar el proxy LLM.")
        if plan.credits <= 0:
            raise HTTPException(status_code=402, detail="No tienes créditos suficientes para usar el proxy LLM.")

    # --- Rate limiting ---
    # Verificar si el usuario es desarrollador
    is_developer = getattr(current_user, "is_developer", False) and getattr(current_user, "dev_plan_active", False)
    
    # Solo aplicar rate limiting a usuarios no desarrolladores
    if not is_developer:
        key, limit = crud_llm_limits.check_llm_limits(db, current_user.id)
        if key is not None:
            raise HTTPException(status_code=429, detail=f"Límite de uso excedido ({key}: {limit})")
    
    # Siempre registrar el uso para propósitos de auditoría
    crud_llm_limits.log_llm_request(db, current_user.id)
    
    # Solo consumir créditos para usuarios normales
    if not is_developer:
        crud_user_plan.consume_credit(db, current_user.id)

    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set in environment")

    content_type = request.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        body = await request.json()
        # Soportar los campos: content, schemas, step, etc.
        content = body.get("content")
        schemas = body.get("schemas")
        step = body.get("step")
        # Prompt dinámico según el step
        if step == "identify_schema":
            # Prompt para identificar el esquema
            schemas_str = f"\nOpciones: {', '.join(schemas)}" if schemas else ""
            full_prompt = (
                "Eres un asistente experto en clasificación de documentos. "
                "Dado el siguiente contenido y la lista de esquemas, responde solo con el nombre del esquema más adecuado." + schemas_str
            )
            messages = [
                {"role": "system", "content": full_prompt},
                {"role": "user", "content": content}
            ]
        elif step == "generate_sql_json":
            # Prompt para extracción de datos
            full_prompt = (
                "Eres un experto en extracción de datos. Dado el siguiente contenido, genera:\n"
                "- Los comandos SQL INSERT para poblar todas las tablas relevantes del esquema en SQLite.\n"
                "- El JSON correspondiente siguiendo el schema.\n"
                "Responde en formato JSON así: {'sql_inserts': '...', 'json_data': {...}}"
            )
            messages = [
                {"role": "system", "content": full_prompt},
                {"role": "user", "content": content}
            ]
        else:
            # Prompt directo si no hay step
            messages = [
                {"role": "user", "content": content}
            ]
        llm_output = await call_openai(messages)
        return JSONResponse(content={"llm_output": llm_output})
    # Si es multipart/form-data
    if prompt is None:
        raise HTTPException(status_code=400, detail="Missing prompt field.")
    message_content = [
        {"type": "text", "text": prompt}
    ]
    if files:
        for f in files:
            content = await f.read()
            mime = f.content_type or "application/octet-stream"
            b64 = base64.b64encode(content).decode()
            data_url = f"data:{mime};base64,{b64}"
            if mime.startswith("image/"):
                message_content.append({
                    "type": "image_url",
                    "image_url": {"url": data_url}
                })
            elif mime.startswith("audio/"):
                message_content.append({
                    "type": "audio",
                    "audio": {"url": data_url}
                })
            else:
                # Subir archivo a OpenAI y usar file_id
                import httpx
                headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
                files_upload = {"file": (f.filename, content, mime)}
                async with httpx.AsyncClient() as client:
                    upload_resp = await client.post(
                        "https://api.openai.com/v1/files",
                        headers=headers,
                        files=files_upload,
                        data={"purpose": "assistants"}
                    )
                    upload_resp.raise_for_status()
                    file_id = upload_resp.json()["id"]
                message_content.append({
                    "type": "file",
                    "file": {"file_id": file_id}
                })
    messages = [
        {"role": "user", "content": message_content}
    ]
    llm_output = await call_openai(messages)
    # Logging condicional solo en DEBUG y localhost
    from app.core.config import settings
    import logging
    if (
        getattr(settings, 'LOG_LEVEL', '').upper() == 'DEBUG'
        and 'localhost' in str(getattr(settings, 'SERVER_HOST', ''))
    ):
        logging.getLogger("llm_proxy").debug(f"[DEBUG][localhost] Mensaje enviado a LLM: {messages}")
        logging.getLogger("llm_proxy").debug(f"[DEBUG][localhost] Respuesta cruda del LLM: {llm_output}")
    return JSONResponse(content={"llm_output": llm_output})
