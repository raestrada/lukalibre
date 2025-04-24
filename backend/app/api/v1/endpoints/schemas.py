import os
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import List

SCHEMAS_DIR = os.getenv('SCHEMAS_DIR') or os.path.abspath(os.path.join(os.getcwd(), 'app/static_schemas'))

router = APIRouter()

def list_schema_files():
    files = [f for f in os.listdir(SCHEMAS_DIR) if f.endswith('.schema.json')]
    return files

def load_schema(name: str):
    path = os.path.join(SCHEMAS_DIR, f"{name}.schema.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None

def extract_metadata(schema_json):
    # Suponemos que los schemas tienen 'title', 'description' y 'properties'
    meta = {
        'title': schema_json.get('title'),
        'description': schema_json.get('description'),
        'properties': list(schema_json.get('properties', {}).keys()),
    }
    return meta

@router.get("/", response_model=List[dict])
def list_schemas():
    schemas = []
    for filename in list_schema_files():
        name = filename.replace('.schema.json', '')
        schema_json = load_schema(name)
        if schema_json:
            meta = extract_metadata(schema_json)
            schemas.append({
                'name': name,
                'meta': meta
            })
    return schemas

@router.get("/{name}")
def get_schema(name: str):
    schema_json = load_schema(name)
    if not schema_json:
        raise HTTPException(status_code=404, detail="Schema not found")
    meta = extract_metadata(schema_json)
    return {"name": name, "meta": meta, "schema": schema_json}
