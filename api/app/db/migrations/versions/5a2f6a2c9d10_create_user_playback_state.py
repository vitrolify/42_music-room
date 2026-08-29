"""create user playback state

Revision ID: 5a2f6a2c9d10
Revises: 1fc83f47fb6c
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "5a2f6a2c9d10"
down_revision: Union[str, None] = "1fc83f47fb6c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    playback_status = sa.Enum("playing", "paused", name="playback_status_enum")
    playback_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "user_playback_states",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("video_id", sa.String(length=32), nullable=False),
        sa.Column("status", playback_status, nullable=False),
        sa.Column("position_seconds", sa.Float(), nullable=False, server_default="0"),
        sa.Column("duration_seconds", sa.Float(), nullable=False, server_default="0"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("controller_session_id", sa.String(length=128), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("user_playback_states")
    sa.Enum(name="playback_status_enum").drop(op.get_bind(), checkfirst=True)
