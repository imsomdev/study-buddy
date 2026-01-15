"""remove file_url column from study_documents

Revision ID: a1b2c3d4e5f6
Revises: 00cb7f33c013
Create Date: 2025-01-15

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "00cb7f33c013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove the file_url column - URLs are now generated dynamically."""
    op.drop_column("study_documents", "file_url")


def downgrade() -> None:
    """Re-add file_url column."""
    op.add_column(
        "study_documents",
        sa.Column("file_url", sa.String(), nullable=True),
    )
