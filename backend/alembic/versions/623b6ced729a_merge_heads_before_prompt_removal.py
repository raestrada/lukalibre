"""merge_heads_before_prompt_removal

Revision ID: 623b6ced729a
Revises: dashboard_balance_report, 490fed743eb0
Create Date: 2025-04-27 13:06:56.894759

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "623b6ced729a"
down_revision = ("dashboard_balance_report", "490fed743eb0")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
