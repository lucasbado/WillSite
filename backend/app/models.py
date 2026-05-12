from . import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="cliente")
    nome_completo = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    cpf = db.Column(db.String(14), unique=True, nullable=False)
    cep = db.Column(db.String(9))
    endereco = db.Column(db.String(255))
    telefone = db.Column(db.String(20), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)


class InventoryItem(db.Model):
    __tablename__ = "inventory_items"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    categoria = db.Column(db.String(50), default="Hardware")
    descricao = db.Column(db.Text)
    quantidade = db.Column(db.Float, nullable=False)
    minimo = db.Column(db.Integer, default=5)
    modelo_compativel = db.Column(db.String(50), default="Geral")
    preco_custo = db.Column(db.Float, default=0.0)
    preco_venda = db.Column(db.Float, default=0.0)


class InventoryLoss(db.Model):
    __tablename__ = "inventory_losses"
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    valor_perda = db.Column(db.Float, nullable=False)  # Aqui está correto!
    motivo = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())


class DeviceModel(db.Model):
    __tablename__ = "device_models"
    id = db.Column(db.Integer, primary_key=True)
    marca = db.Column(db.String(50), nullable=False)  # Ex: Apple, Samsung
    modelo = db.Column(db.String(100), unique=True, nullable=False)  # Ex: iPhone 13 Pro
    # ADICIONE ESTE CAMPO: Fundamental para o técnico e para a busca
    codigo_tecnico = db.Column(db.String(50), unique=True, nullable=True

    )  # Ex: A2638, SM-S911

    # Ajuda a Ollie (IA) a encontrar o modelo mesmo com erro de digitação
    tags_busca = db.Column(db.Text, nullable=True)  # Ex: "13pro, iph13, apple"

    def to_dict(self):
        return {
            "id": self.id,
            "marca": self.marca,
            "modelo": self.modelo,
            "codigo_tecnico": self.codigo_tecnico or "",
        }


class Vendor(db.Model):
    __tablename__ = "vendors"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    whatsapp = db.Column(db.String(20), nullable=False)
    prazo_entrega = db.Column(db.String(50))
    rating = db.Column(db.Integer, default=5)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())


class VendorPriceQuote(db.Model):
    __tablename__ = "vendor_quotes"
    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"))
    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"))
    preco_cotado = db.Column(db.Float)
    ultima_atualizacao = db.Column(db.DateTime, default=db.func.current_timestamp())


class WorkOrder(db.Model):
    __tablename__ = "work_orders"
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    device_model = db.Column(db.String(100), nullable=False)
    problem_description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default="Pendente")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    data_agendamento_entrega = db.Column(db.DateTime)
    scheduled_date = db.Column(db.DateTime)
    deletada = db.Column(db.Boolean, default=False)
    excluida_por = db.Column(db.String(50))
    laudo_tecnico = db.Column(db.Text, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)
    
    # NOVOS CAMPOS DE RASTREAMENTO
    verification_code = db.Column(db.String(4), nullable=True) # Código de 4 dígitos
    ready_at = db.Column(db.DateTime, nullable=True) # Quando ficou pronto
    code_expires_at = db.Column(db.DateTime, nullable=True) # DATA DE EXPIRAÇÃO
        
    

    # NOVOS CAMPOS FINANCEIROS
    valor_mao_obra = db.Column(db.Float, default=0.0)  # Customizável por OS
    custo_operacional = db.Column(db.Float, default=0.0)  # Energia, ferramentas, etc.
    desconto_aplicado = db.Column(db.Float, default=0.0)  # Descontos concedidos
    total_price = db.Column(db.Float, nullable=True)  # Preço final calculado

    # RELACIONAMENTOS
    items_used = db.relationship(
        "ConsumedItem", backref="work_order", cascade="all, delete-orphan"
    )
    client = db.relationship("User", backref="my_orders")


class ConsumedItem(db.Model):
    __tablename__ = "consumed_items"
    id = db.Column(db.Integer, primary_key=True)
    work_order_id = db.Column(
        db.Integer, db.ForeignKey("work_orders.id"), nullable=False
    )
    inventory_item_id = db.Column(
        db.Integer, db.ForeignKey("inventory_items.id"), nullable=False
    )
    quantidade = db.Column(db.Integer, default=1)

    inventory_item = db.relationship("InventoryItem")


class LaborConfig(db.Model):
    """Configurações de mão de obra por tipo de serviço/marca"""
    __tablename__ = "labor_configs"
    id = db.Column(db.Integer, primary_key=True)
    marca = db.Column(db.String(50), nullable=False)  # Apple, Samsung, etc.
    tipo_servico = db.Column(db.String(100), nullable=False)  # "Troca de Tela", "Bateria", etc.
    valor_padrao = db.Column(db.Float, nullable=False)  # R$ 50.00
    tempo_estimado_min = db.Column(db.Integer, default=30)  # Tempo em minutos
    ativo = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    __table_args__ = (db.UniqueConstraint('marca', 'tipo_servico', name='unique_marca_servico'),)


class OperationalCost(db.Model):
    """Custos operacionais por período"""
    __tablename__ = "operational_costs"
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(200), nullable=False)  # "Energia Elétrica", "Ferramentas", etc.
    valor_mensal = db.Column(db.Float, nullable=False)
    categoria = db.Column(db.String(50), default="Geral")  # Energia, Manutenção, etc.
    ativo = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
