"""Idempotência das solicitações e limites compartilhados do assistente."""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('work_orders') as batch:
        batch.add_column(sa.Column('intake_request_id', sa.String(36), nullable=True))
        batch.create_unique_constraint('uq_work_orders_client_intake', ['client_id', 'intake_request_id'])
    op.create_table('assistant_buckets',
        sa.Column('scope', sa.String(160), primary_key=True),
        sa.Column('window', sa.BigInteger(), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False))


def downgrade():
    op.drop_table('assistant_buckets')
    with op.batch_alter_table('work_orders') as batch:
        batch.drop_constraint('uq_work_orders_client_intake', type_='unique')
        batch.drop_column('intake_request_id')
