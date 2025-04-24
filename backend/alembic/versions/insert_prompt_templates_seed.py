"""insert prompt templates base

Revision ID: prompt_templates_seed
Revises: 227441b19fd3
Create Date: 2025-04-24

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'prompt_templates_seed'
down_revision = '227441b19fd3'
branch_labels = None
depends_on = None

def upgrade():
    op.execute(
        """
        INSERT INTO prompt_templates (name, description, template)
        VALUES
        (
            'identify_schema',
            'Prompt para identificar el esquema más adecuado para un texto/documento.',
            'Eres un asistente experto en clasificación de documentos financieros en Chile.\nDado el siguiente contenido y la lista de esquemas, responde solo con el nombre del esquema más adecuado.\nLista de esquemas disponibles: {{schemas}}\nContenido: {{content}}\nResponde solo con el nombre del esquema, sin explicación.'
        ),
        (
            'generate_sql_json',
            'Prompt para transformar un texto en SQL y JSON según el schema identificado.',
            'Eres un asistente experto en extracción estructurada de datos financieros en Chile.\nDado el siguiente contenido y el schema en formato JSON Schema, genera:\n- Un objeto JSON válido con los campos requeridos para el esquema.\n- Una sentencia SQL INSERT correspondiente al esquema y los datos extraídos.\nContenido: {{content}}\nSchema JSON: {{schema_json}}\nResponde en el formato:\n{\n  "json_data": { ... },\n  "sql_inserts": "INSERT INTO ...;"\n}'
        ),
        (
            'recommendation_cl',
            'Recomendaciones financieras personalizadas para usuarios en Chile, usando contexto nacional y datos reales del usuario (dump de SQLite).',
            'Eres un asistente financiero chileno. Analizas los ingresos, gastos y metas del usuario para sugerir recomendaciones prácticas, considerando las normativas y mejores prácticas de finanzas personales en Chile.\n\nContexto de finanzas personales en Chile:\n- Las finanzas personales son la administración del dinero en el día a día, no se trata de invertir ni de hacerse rico, sino de llegar a fin de mes y tomar mejores decisiones.\n- Es importante anotar todo lo que entra (ingresos) y todo lo que sale (gastos), agrupando por categorías como arriendo, cuentas básicas, alimentación, transporte, deudas, educación, salud y gastos variables.\n- El presupuesto debe ser una brújula, no una cárcel: pequeños ajustes pueden ayudar a mejorar el superávit sin sacrificar calidad de vida.\n- Evita deudas innecesarias, planifica el mes y mantén el control sobre tus finanzas.\n- Administrar tu plata es una herramienta de defensa básica para cualquier persona común.\n\nA continuación tienes los datos reales del usuario, extraídos de su base SQLite local:\n\nResumen mensual:\n{{resumen_mensual}}\n\nMovimientos (ingresos, gastos, ahorros):\n{{movimientos}}\n\nRecomendación:'
        )
        ;
        """
    )

def downgrade():
    op.execute("DELETE FROM prompt_templates WHERE name IN ('identify_schema', 'generate_sql_json', 'recommendation_cl');")
