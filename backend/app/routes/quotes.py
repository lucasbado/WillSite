from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy.exc import IntegrityError

from .. import db
from ..models import InventoryItem, QuoteDemand, RepairOffering, User
from ..services.quotes import ISSUES, SERVICES, catalog_snapshot, estimate, key, money

quotes_bp = Blueprint('quotes', __name__)


@quotes_bp.get('/services')
def services():
    return jsonify([dict(code=code, label=label) for code, label in SERVICES.items()])


@quotes_bp.post('/estimate')
def quote():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get('model'), str) or not 2 <= len(data['model'].strip()) <= 100 or len(key(data['model'])) < 2 or not isinstance(data.get('service'), str) or data['service'] not in SERVICES:
        return jsonify(msg='Informe o modelo e escolha o serviço para consultar a estimativa.'), 400
    # Visitantes consultam preços; só pedidos de clientes verificados geram demanda persistente.
    verify_jwt_in_request(optional=True)
    identity = get_jwt_identity()
    user = db.session.get(User, int(identity)) if isinstance(identity, str) and identity.isdecimal() else None
    model, service = data['model'].strip(), data['service']
    result = estimate(model, service)
    if user and user.is_verified and user.role == 'cliente' and result['status'] != 'ambiguous':
        model = result['model']
        try:
            demand = QuoteDemand.query.filter_by(model_key=key(model), service=service).first()
            if demand:
                demand.last_seen = datetime.utcnow()
            else:
                db.session.add(QuoteDemand(model=model, model_key=key(model), service=service))
            db.session.commit()
        except IntegrityError:
            db.session.rollback()  # Requisições concorrentes compartilham a mesma pendência.
        result['team_notified'] = bool(result['issues'])
    return jsonify(result)


@quotes_bp.get('/admin/catalog')
def catalog():
    return jsonify([dict(id=i.id, model=i.model, service=i.service,
        inventory_item_id=i.inventory_item_id, labor_price=str(i.labor_price) if i.labor_price is not None else '',
        active=i.active) for i in RepairOffering.query.order_by(RepairOffering.model).all()])


@quotes_bp.post('/admin/catalog')
@quotes_bp.put('/admin/catalog/<int:offering_id>')
def save(offering_id=None):
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get('model'), str) or not 2 <= len(data['model'].strip()) <= 100 or len(key(data['model'])) < 2 or not isinstance(data.get('service'), str) or data['service'] not in SERVICES or not isinstance(data.get('active', True), bool):
        return jsonify(msg='Confira o modelo e o serviço.'), 400
    labor = money(data.get('labor_price'), allow_zero=True)
    if data.get('labor_price') not in (None, '') and labor is None:
        return jsonify(msg='Mão de obra inválida. Use um valor entre 0 e 999.999,99.'), 400
    part_id = data.get('inventory_item_id')
    if part_id is not None and (type(part_id) is not int or not db.session.get(InventoryItem, part_id)):
        return jsonify(msg='Selecione uma peça existente ou deixe sem vínculo.'), 400
    item = db.get_or_404(RepairOffering, offering_id) if offering_id else RepairOffering()
    item.model = data['model'].strip()
    item.model_key = key(item.model)
    item.service = data['service']
    item.inventory_item_id = part_id
    item.labor_price = labor
    item.active = data.get('active', True)
    db.session.add(item)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(msg='Já existe um cadastro para esse modelo e serviço. Edite o existente.'), 409
    return jsonify(id=item.id), 200 if offering_id else 201


@quotes_bp.get('/admin/alerts')
def alerts():
    # Recalcula com os preços/quantidades atuais: corrigir o cadastro resolve a pendência.
    result = []
    snapshot = catalog_snapshot()
    seen = set()
    for demand in QuoteDemand.query.order_by(QuoteDemand.last_seen.desc()).limit(500).all():
        quote = estimate(demand.model, demand.service, snapshot)
        demand_key = (key(quote['model']), demand.service)
        if quote['issues'] and demand_key not in seen:
            seen.add(demand_key)
            result.append(dict(model=quote['model'], service=demand.service, service_label=SERVICES[demand.service],
                issues=quote['issues'], reasons=[ISSUES[i] for i in quote['issues']],
                last_seen=demand.last_seen.isoformat() + 'Z', source='customer'))
    # Também encontra problemas de cadastro antes de receber consultas de clientes.
    for item in snapshot[0]:
        quote = estimate(item.model, item.service, snapshot)
        if quote['issues'] and (item.model_key, item.service) not in seen:
            result.append(dict(model=item.model, service=item.service, service_label=SERVICES[item.service],
                issues=quote['issues'], reasons=[ISSUES[i] for i in quote['issues']], source='catalog'))
    unpriced = InventoryItem.query.filter((InventoryItem.preco_venda <= 0) | InventoryItem.preco_venda.is_(None)).all()
    return jsonify(alerts=result, unpriced_parts=[dict(id=i.id, name=i.nome, model=i.modelo_compativel) for i in unpriced])
