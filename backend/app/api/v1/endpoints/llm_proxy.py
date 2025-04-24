from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import httpx
from app.core.config import settings

router = APIRouter()

GROQ_API_KEY = settings.GROQ_API_KEY
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "deepseek-r1-distill-llama-70b"

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

async def call_groq(messages):
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 2048
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(GROQ_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Groq LLM error: {response.text}")
        data = response.json()
        return data["choices"][0]["message"]["content"]

from fastapi import Depends, Header
from app.api import deps
from app.models.user import User

@router.post("/proxy", response_model=LLMProxyResponse)
async def llm_proxy(
    payload: LLMProxyRequest,
    current_user: User = Depends(deps.get_current_user)
):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment")
    # Paso 1: Identificación de esquema
    if payload.step == "identify_schema":
        system_prompt = (
            "Eres un asistente experto en clasificación de documentos. "
            "Dado el siguiente contenido y la lista de esquemas, responde solo con el nombre del esquema más adecuado. "
            "Lista de esquemas disponibles: " + ", ".join(payload.schemas or [])
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": payload.content}
        ]
        schema_name = await call_groq(messages)
        return LLMProxyResponse(schema_name=schema_name.strip())
    # Paso 2: Generación de SQL y JSON
    elif payload.step == "generate_sql_json":
        if not payload.schema_name:
            raise HTTPException(status_code=400, detail="schema_name is required for this step")
        system_prompt = (
            f"Eres un experto en extracción de datos. Dado el siguiente contenido, genera:\n"
            f"- Los comandos SQL INSERT para poblar todas las tablas relevantes del esquema '{payload.schema_name}' en SQLite.\n"
            f"- El JSON correspondiente siguiendo el schema '{payload.schema_name}'.\n"
            f"Responde en formato JSON así: {{'sql_inserts': '...', 'json_data': {{...}}}}"
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": payload.content}
        ]
        llm_output = await call_groq(messages)
        # Intentar extraer los campos esperados
        try:
            import json
            output = json.loads(llm_output.replace("'", '"'))  # LLM puede usar comillas simples
            return LLMProxyResponse(
                sql_inserts=output.get('sql_inserts'),
                json_data=output.get('json_data'),
                llm_output=llm_output
            )
        except Exception as e:
            return LLMProxyResponse(llm_output=llm_output)
    else:
        raise HTTPException(status_code=400, detail="Invalid step value")
