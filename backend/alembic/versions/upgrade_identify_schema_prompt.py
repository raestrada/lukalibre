"""update identify_schema prompt for stricter schema name selection

Revision ID: upgrade_ident_schema_prompt
Revises: prompt_templates_seed
Create Date: 2025-04-24
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "upgrade_ident_schema_prompt"
down_revision = "prompt_templates_seed"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
    UPDATE prompt_templates
    SET template = 'Eres un asistente experto en clasificación de documentos financieros en Chile.\nDado el siguiente contenido y la lista de esquemas, responde únicamente con uno de los nombres exactos de la lista proporcionada.\nLista de esquemas disponibles: {{schemas}}\nContenido: {{content}}\nIMPORTANTE: Devuelve únicamente el nombre exacto de uno de los esquemas tal como aparece en la lista, sin explicación ni texto adicional.'
    WHERE name = 'identify_schema';
    """
    )


def downgrade():
    op.execute(
        """
    UPDATE prompt_templates
    SET template = 'Eres un asistente experto en clasificación de documentos financieros en Chile.\nDado el siguiente contenido y la lista de esquemas, responde solo con el nombre del esquema más adecuado.\nLista de esquemas disponibles: {{schemas}}\nContenido: {{content}}\nResponde solo con el nombre del esquema, sin explicación.'
    WHERE name = 'identify_schema';
    """
    )
