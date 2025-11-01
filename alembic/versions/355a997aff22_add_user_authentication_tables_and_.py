"""Add user authentication tables and relationships

Revision ID: 355a997aff22
Revises: d2c1caff1299
Create Date: 2025-11-01 10:19:54.942361

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '355a997aff22'
down_revision: Union[str, Sequence[str], None] = 'd2c1caff1299'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    from sqlalchemy import orm
    import bcrypt

    # Helper function to hash password using bcrypt
    def hash_password_safe(password: str) -> str:
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')

    # Create users table
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('hashed_password', sa.String(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('is_verified', sa.Boolean(), nullable=True),
    sa.Column('reset_token', sa.String(), nullable=True),
    sa.Column('reset_token_expires', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Create a default system user for existing documents
    bind = op.get_bind()
    session = orm.Session(bind=bind)

    # Insert default user
    default_password = hash_password_safe("ChangeMe123!")
    session.execute(
        sa.text(
            "INSERT INTO users (email, hashed_password, is_active, is_verified) "
            "VALUES ('system@studybuddy.local', :password, true, true)"
        ),
        {"password": default_password}
    )
    session.commit()

    # Get the default user ID
    result = session.execute(sa.text("SELECT id FROM users WHERE email = 'system@studybuddy.local'"))
    default_user_id = result.scalar()

    # Add indexes and foreign keys
    op.create_index(op.f('ix_mcq_questions_document_id'), 'mcq_questions', ['document_id'], unique=False)
    op.create_foreign_key(None, 'mcq_questions', 'study_documents', ['document_id'], ['id'])

    # Add user_id column as nullable first
    op.add_column('study_documents', sa.Column('user_id', sa.Integer(), nullable=True))

    # Update existing documents to belong to the default user
    session.execute(
        sa.text("UPDATE study_documents SET user_id = :user_id WHERE user_id IS NULL"),
        {"user_id": default_user_id}
    )
    session.commit()

    # Now make user_id NOT NULL
    op.alter_column('study_documents', 'user_id', nullable=False)

    # Create index and foreign key
    op.create_index(op.f('ix_study_documents_user_id'), 'study_documents', ['user_id'], unique=False)
    op.create_foreign_key(None, 'study_documents', 'users', ['user_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign keys and indexes from study_documents
    op.drop_constraint(None, 'study_documents', type_='foreignkey')
    op.drop_index(op.f('ix_study_documents_user_id'), table_name='study_documents')
    op.drop_column('study_documents', 'user_id')

    # Drop foreign key and index from mcq_questions
    op.drop_constraint(None, 'mcq_questions', type_='foreignkey')
    op.drop_index(op.f('ix_mcq_questions_document_id'), table_name='mcq_questions')

    # Drop users table
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
