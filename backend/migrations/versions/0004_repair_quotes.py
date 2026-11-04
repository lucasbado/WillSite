"""Catálogo de orçamentos e demandas para manutenção do estoque."""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('repair_offerings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('model', sa.String(100), nullable=False),
        sa.Column('model_key', sa.String(100), nullable=False),
        sa.Column('service', sa.String(30), nullable=False),
        sa.Column('inventory_item_id', sa.Integer(), sa.ForeignKey('inventory_items.id', ondelete='SET NULL')),
        sa.Column('labor_price', sa.Numeric(10, 2)),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.UniqueConstraint('model_key', 'service', name='uq_offering_model_service'))
    op.create_table('quote_demands',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('model', sa.String(100), nullable=False),
        sa.Column('model_key', sa.String(100), nullable=False),
        sa.Column('service', sa.String(30), nullable=False),
        sa.Column('first_seen', sa.DateTime(), nullable=False),
        sa.Column('last_seen', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('model_key', 'service', name='uq_quote_demand_model_service'))


def downgrade():
    op.drop_table('quote_demands')
    op.drop_table('repair_offerings')
