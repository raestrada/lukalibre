"""add dashboard balance report prompt template

Revision ID: dashboard_balance_report
Revises: dashboard_html_report
Create Date: 2025-04-27

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'dashboard_balance_report'
down_revision = 'dashboard_html_report'
branch_labels = None
depends_on = None

def upgrade():
    op.execute(
        """
        INSERT INTO prompt_templates (name, description, template)
        VALUES
        (
            'dashboard_balance_report_cl',
            'Prompt para generación de balance financiero en formato JSON para usuarios en Chile.',
            'Eres un analista financiero experto que evalúa datos financieros personales para usuarios en Chile.

Tu tarea es analizar los datos financieros proporcionados y devolver ÚNICAMENTE un objeto JSON con un balance detallado, siguiendo exactamente esta estructura:

{
  "resumen": {
    "activos": {
      "total": "string con formato $X.XXX.XXX",
      "items": [{ "nombre": "string", "valor": "string", "descripcion": "string" }]
    },
    "pasivos": {
      "total": "string con formato $X.XXX.XXX",
      "items": [{ "nombre": "string", "valor": "string", "descripcion": "string" }]
    },
    "patrimonio": {
      "total": "string con formato $X.XXX.XXX",
      "tendencia": número entre -1 y 1
    }
  },
  "graficos": [
    {
      "titulo": "string",
      "tipo": "pie | bar | line",
      "datos": { "labels": ["array de strings"], "datasets": [{ "label": "string", "data": [array de números] }] }
    }
  ],
  "ratios": [
    {
      "nombre": "string",
      "valor": número entre 0 y 1,
      "objetivo": número entre 0 y 1,
      "descripcion": "string",
      "tipo": "success | warning | error | default"
    }
  ],
  "distribucion": {
    "activos": [{ "nombre": "string", "porcentaje": número }],
    "pasivos": [{ "nombre": "string", "porcentaje": número }]
  },
  "tendencias": {
    "patrimonio": [números],
    "activos": [números],
    "pasivos": [números]
  },
  "recomendaciones": [
    {
      "titulo": "string",
      "mensaje": "string",
      "tipo": "success | warning | error | info"
    }
  ]
}

Consideraciones específicas para Chile:
- Usa formato de moneda chilena ($1.234.567)
- Incluye recomendaciones específicas para el contexto chileno (APV, leyes tributarias, etc.)
- Si hay insuficientes datos, devuelve un JSON con todas las claves pero con mensajes indicando que faltan datos
- No generes HTML, solo devuelve el objeto JSON con la estructura especificada arriba

Datos de entrada: {{user_json}}'
        )
        ;
        """
    )

def downgrade():
    op.execute("DELETE FROM prompt_templates WHERE name = 'dashboard_balance_report_cl';")
