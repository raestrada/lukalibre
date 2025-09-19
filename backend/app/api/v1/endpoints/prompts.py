from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Optional
import os
from pathlib import Path
from app.api import deps
from app.models.user import User

router = APIRouter()

# Path to prompts directory
PROMPTS_DIR = Path(__file__).parent.parent.parent.parent / "prompts"

def load_prompt_template(template_name: str) -> str:
    """Load a prompt template from file"""
    file_path = PROMPTS_DIR / f"{template_name}.md"

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Prompt template '{template_name}' not found"
        )

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading prompt template: {str(e)}"
        )

@router.get("/templates")
async def get_all_prompt_templates(
    current_user: User = Depends(deps.get_current_user)
) -> JSONResponse:
    """
    Get all available prompt templates
    Returns a dictionary with template names as keys and content as values
    """
    try:
        templates = {}

        # List all .md files in prompts directory
        if PROMPTS_DIR.exists():
            for file_path in PROMPTS_DIR.glob("*.md"):
                template_name = file_path.stem
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        templates[template_name] = f.read()
                except Exception as e:
                    print(f"Error reading template {template_name}: {e}")
                    continue

        return JSONResponse(content={"default": templates})

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading prompt templates: {str(e)}"
        )

@router.get("/templates/{template_name}")
async def get_prompt_template(
    template_name: str,
    current_user: User = Depends(deps.get_current_user)
) -> JSONResponse:
    """
    Get a specific prompt template by name
    """
    try:
        content = load_prompt_template(template_name)
        return JSONResponse(content={"template": content})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading prompt template: {str(e)}"
        )

@router.get("/available")
async def get_available_templates(
    current_user: User = Depends(deps.get_current_user)
) -> JSONResponse:
    """
    Get list of available prompt template names
    """
    try:
        templates = []

        if PROMPTS_DIR.exists():
            for file_path in PROMPTS_DIR.glob("*.md"):
                templates.append(file_path.stem)

        return JSONResponse(content={"templates": templates})

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing prompt templates: {str(e)}"
        )