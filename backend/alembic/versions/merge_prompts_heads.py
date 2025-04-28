"""Merge upd_prompt_tpls_rm_codeblock and upgrade_ident_schema_prompt heads"""

from alembic import op

revision = "mergeprompts1"
down_revision = ("upd_prompt_tpls_rm_codeblock", "upgrade_ident_schema_prompt")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
