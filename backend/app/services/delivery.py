from collections import Counter
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
import secrets

from flask import g
from .. import db
from ..models import ConsumedItem, InventoryItem

READY = "Pronto para Retirada"
COMPLETED = {"Concluído", "Entregue"}
MAX_ATTEMPTS = 5


def utc_now():
    # As colunas existentes usam UTC sem timezone; preservamos o formato do banco.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class DeliveryError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def issue_code(order, minutes=30):
    if type(minutes) is not int or not 1 <= minutes <= 120:
        raise DeliveryError("A validade deve ser um número inteiro de 1 a 120 minutos")
    if order.deletada or order.status in COMPLETED:
        raise DeliveryError("Esta OS já foi encerrada", 409)
    now = utc_now()
    previous = order.verification_code
    code = f"{secrets.randbelow(10000):04d}"
    while code == previous:
        code = f"{secrets.randbelow(10000):04d}"
    order.verification_code = code
    order.verification_attempts = 0
    order.ready_at = order.ready_at or now
    order.code_expires_at = now + timedelta(minutes=minutes)
    order.finished_at = None
    order.status = READY


def code_payload(order):
    return {
        "id": order.id,
        "status": order.status,
        "verification_code": order.verification_code,
        "ready_at": order.ready_at.isoformat() + "Z" if order.ready_at else None,
        "code_expires_at": order.code_expires_at.isoformat() + "Z" if order.code_expires_at else None,
    }


def confirm_delivery(order, code, bypass=False):
    if order.deletada or order.status != READY:
        raise DeliveryError("A OS não está disponível para retirada", 409)
    if type(bypass) is not bool:
        raise DeliveryError("is_bypass deve ser booleano")
    if bypass:
        if g.current_user.role != "admin":
            raise DeliveryError("Apenas administradores podem liberar sem código", 403)
    else:
        if (order.verification_attempts or 0) >= MAX_ATTEMPTS:
            raise DeliveryError("Código bloqueado. Peça ao administrador um novo código", 429)
        if not order.verification_code or not order.code_expires_at or order.code_expires_at <= utc_now():
            raise DeliveryError("Código expirado. Peça ao administrador um novo código", 410)
        if not isinstance(code, str) or len(code) != 4 or not code.isascii() or not code.isdecimal():
            valid = False
        else:
            valid = secrets.compare_digest(order.verification_code, code)
        if not valid:
            order.verification_attempts = (order.verification_attempts or 0) + 1
            db.session.commit()  # A contagem deve sobreviver à resposta de erro.
            status = 429 if order.verification_attempts >= MAX_ATTEMPTS else 422
            raise DeliveryError("Código incorreto ou bloqueado", status)
    order.status = "Concluído"
    order.finished_at = utc_now()
    order.verification_code = None
    order.code_expires_at = None
    order.verification_attempts = 0
    order.delivery_bypassed = bypass
    order.delivered_by_id = g.current_user.id
    db.session.commit()


def money(value, field):
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount < 0:
            raise ValueError()
        return amount.quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        raise DeliveryError(f"{field} deve ser um valor válido e não negativo") from None


def finish_repair(order, data):
    # Uma repetição da chamada não pode baixar estoque nem cobrar peças novamente.
    if order.ready_at is not None or order.status == READY or order.status in COMPLETED:
        raise DeliveryError("Reparo já finalizado. Use a confirmação de entrega", 409)
    ids = data.get("itens_ids", [])
    if not isinstance(ids, list) or any(type(item) is not int or item <= 0 for item in ids):
        raise DeliveryError("itens_ids deve ser uma lista de identificadores válidos")
    labor = money(data.get("valor_mao_obra", 0), "Mão de obra")
    operational = money(data.get("custo_operacional", 0), "Custo operacional")
    discount = money(data.get("desconto_aplicado", data.get("desconto", 0)), "Desconto")
    quantities = Counter(ids)
    items = InventoryItem.query.filter(InventoryItem.id.in_(quantities)).order_by(InventoryItem.id).populate_existing().with_for_update().all()
    if len(items) != len(quantities):
        raise DeliveryError("Uma das peças selecionadas não existe")
    parts_total = Decimal("0")
    for item in items:
        if item.quantidade < quantities[item.id]:
            raise DeliveryError(f"Estoque insuficiente para {item.nome}")
        parts_total += money(item.preco_venda or 0, "Preço da peça") * quantities[item.id]
    total = parts_total + labor + operational - discount
    if total < 0:
        raise DeliveryError("O desconto não pode superar o valor do serviço")
    for item in items:
        quantity = quantities[item.id]
        item.quantidade -= quantity
        db.session.add(ConsumedItem(work_order_id=order.id, inventory_item_id=item.id, quantidade=quantity))
    order.laudo_tecnico = data.get("laudo", "")
    order.valor_mao_obra = float(labor)
    order.custo_operacional = float(operational)
    order.desconto_aplicado = float(discount)
    order.total_price = float(total)
    issue_code(order)
    db.session.commit()
