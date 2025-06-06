"""add user_llm_limits and llm_request_logs

Revision ID: ffd039311be6
Revises: 65adc6e230bc
Create Date: 2025-04-24 13:27:11.398353

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ffd039311be6"
down_revision = "65adc6e230bc"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "llm_request_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_llm_request_logs_created_at"),
        "llm_request_logs",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_llm_request_logs_id"), "llm_request_logs", ["id"], unique=False
    )
    op.create_table(
        "user_llm_limits",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("per_minute", sa.Integer(), nullable=True),
        sa.Column("per_hour", sa.Integer(), nullable=True),
        sa.Column("per_day", sa.Integer(), nullable=True),
        sa.Column("per_week", sa.Integer(), nullable=True),
        sa.Column("per_month", sa.Integer(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        op.f("ix_user_llm_limits_id"), "user_llm_limits", ["id"], unique=False
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f("ix_user_llm_limits_id"), table_name="user_llm_limits")
    op.drop_table("user_llm_limits")
    op.drop_index(op.f("ix_llm_request_logs_id"), table_name="llm_request_logs")
    op.drop_index(op.f("ix_llm_request_logs_created_at"), table_name="llm_request_logs")
    op.drop_table("llm_request_logs")
    # ### end Alembic commands ###
