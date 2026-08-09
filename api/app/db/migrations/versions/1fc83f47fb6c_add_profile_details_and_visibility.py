"""add profile details and visibility

Revision ID: 1fc83f47fb6c
Revises: 98666eda869e
Create Date: 2026-08-09 16:13:29.465435

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '1fc83f47fb6c'
down_revision: Union[str, None] = '98666eda869e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

visibility_enum = postgresql.ENUM(
    'public', 'friends_only', name='visibility_enum'
)


def upgrade() -> None:
    visibility_enum.create(op.get_bind(), checkfirst=True)
    op.add_column('users', sa.Column('mini_bio', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('favorite_artists', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('favorite_genre', sa.String(length=200), nullable=True))
    op.add_column('users', sa.Column('profile_visibility', sa.Enum('public', 'friends_only', name='visibility_enum', create_type=False), server_default='public', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'profile_visibility')
    op.drop_column('users', 'favorite_genre')
    op.drop_column('users', 'favorite_artists')
    op.drop_column('users', 'mini_bio')
    visibility_enum.drop(op.get_bind(), checkfirst=True)
