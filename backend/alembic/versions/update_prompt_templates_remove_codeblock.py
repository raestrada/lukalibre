"""update prompt templates to enforce JSON-only output (no code block)"""

from alembic import op

revision = "upd_prompt_tpls_rm_codeblock"
down_revision = "prompt_templates_seed"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        UPDATE prompt_templates
        SET template = 'Eres un asistente experto en extracción estructurada de datos financieros en Chile.\nDado el siguiente contenido y el schema en formato JSON Schema, genera:\n- Un objeto JSON válido con los campos requeridos para el esquema.\n- Una sentencia SQL INSERT correspondiente al esquema y los datos extraídos.\nContenido: {{content}}\nSchema JSON: {{schema_json}}\nResponde en el formato:\n{\n  \"json_data\": { ... },\n  \"sql_inserts\": \"INSERT INTO ...;\"\n}\n\nIMPORTANTE: Devuelve solo el objeto JSON, sin texto adicional, sin bloques de código ni comentarios.'
        WHERE name = 'generate_sql_json';
        """
    )


def downgrade():
    op.execute(
        """
        UPDATE prompt_templates
        SET template = REPLACE(template,
            'Responde en el formato:\n{\n  "json_data": { ... },\n  "sql_inserts": "INSERT INTO ...;"\n}\n\nIMPORTANTE: Devuelve solo el objeto JSON, sin texto adicional, sin bloques de código ni comentarios.',
            'Responde en el formato:\n{\n  "json_data": { ... },\n  "sql_inserts": "INSERT INTO ...;"\n}')
        WHERE name = 'generate_sql_json';
        """
    )
