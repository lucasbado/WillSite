from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ..models import db, InventoryItem, InventoryLoss, RepairOffering
from ..services.inventory import item_data, quote_data
from sqlalchemy.exc import IntegrityError
from app.models import DeviceModel


inventory_bp = Blueprint("inventory", __name__)


# Helper para checar admin
def is_admin():
    return get_jwt().get("role") == "admin"


@inventory_bp.route("/", methods=["GET"])
@jwt_required()
def listar_estoque():
    itens = InventoryItem.query.all()
    return (
        jsonify(
            [
                {
                    "id": i.id,
                    "nome": i.nome,
                    "descricao": i.descricao,
                    "quantidade": i.quantidade,
                    "preco_custo": i.preco_custo,
                    "preco_venda": i.preco_venda,
                    "categoria": i.categoria,
                    "minimo": i.minimo,
                    "modelo_compativel": i.modelo_compativel,
                    "preco_custo": i.preco_custo or 0.0,
                    "preco_venda": i.preco_venda or 0.0,
                }
                for i in itens
            ]
        ),
        200,
    )


@inventory_bp.route("/adicionar", methods=["POST"])
@jwt_required()
def adicionar_item():
    data = request.get_json(silent=True)
    try:
        values = item_data(data)
        quote = quote_data(data.get('quote'), values)
    except ValueError as error:
        return jsonify(msg=str(error)), 400
    if quote and RepairOffering.query.filter_by(model_key=quote['model_key'], service=quote['service']).first():
        return jsonify(msg='Já existe um orçamento desse modelo e serviço. Desmarque a opção da Cidi para cadastrar só a peça, ou edite o orçamento existente.'), 409
    novo_item = InventoryItem(**values)
    db.session.add(novo_item)
    try:
        db.session.flush()
        if quote:
            db.session.add(RepairOffering(inventory_item_id=novo_item.id, **quote))
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(msg='O cadastro não foi salvo. Confira se esse orçamento já existe e tente novamente.'), 409
    return jsonify(msg='Peça e orçamento cadastrados!' if quote else 'Item cadastrado!', id=novo_item.id), 201


@inventory_bp.route("/filtrar-por-modelo", methods=["GET"])
@jwt_required()
def filtrar_por_modelo():
    modelo = request.args.get("modelo")
    # Busca peças que batem com o modelo OU que são 'Universal'
    pecas = InventoryItem.query.filter(
        (InventoryItem.modelo_compativel.ilike(f"%{modelo}%"))
        | (InventoryItem.modelo_compativel.ilike("Universal"))
    ).all()

    return (
        jsonify(
            [
                {
                    "id": p.id,
                    "nome": p.nome,
                    "quantidade": p.quantidade,
                    "modelo": p.modelo_compativel,
                    "preco_custo": p.preco_custo or 0.0,
                    "preco_venda": p.preco_venda or 0.0,
                }
                for p in pecas
            ]
        ),
        200,
    )


@inventory_bp.route("/api/modelos/sugestao", methods=["GET"])
def buscar_sugestoes():
    termo = request.args.get("q", "")

    if len(termo) < 2:
        return jsonify([]), 200

    # O segredo da Cidi: Busca insensível a maiúsculas (ILIKE)
    # tanto no nome comercial quanto no código técnico.
    sugestoes = (
        DeviceModel.query.filter(
            (DeviceModel.nome_comercial.ilike(f"%{termo}%"))
            | (DeviceModel.codigo_tecnico.ilike(f"%{termo}%"))
        )
        .limit(8)
        .all()
    )  # Limitamos a 8 para manter o dropdown limpo no mobile

    resultados = [
        {
            "id": m.id,
            "marca": m.marca,
            "nome": m.modelo,
            "codigo": m.codigo_tecnico,
        }
        for m in sugestoes
    ]

    return jsonify(resultados), 200


@inventory_bp.route("/ajustar-quantidade/<int:item_id>", methods=["PATCH"])
@jwt_required()
def ajustar_quantidade(item_id):
    item = InventoryItem.query.get_or_404(item_id)
    data = request.get_json()
    operacao = data.get("operacao")

    # Ajuste aqui para o nome correto do atributo (ex: quantidade)
    if operacao == "soma":
        item.quantidade += 1
    elif operacao == "subtrai" and item.quantidade > 0:
        item.quantidade -= 1

    db.session.commit()
    return jsonify({"nova_quantidade": item.quantidade}), 200


@inventory_bp.route("/registrar-perda/<int:item_id>", methods=["POST"])
@jwt_required()
def registrar_perda(item_id):
    data = request.get_json()
    item = InventoryItem.query.get_or_404(item_id)

    qtd_perda = int(data.get("quantidade", 1))

    if item.quantidade < qtd_perda:
        return jsonify({"msg": "Quantidade insuficiente no estoque"}), 400

    # 1. Deduz do estoque real
    item.quantidade -= qtd_perda

    # 2. Registra na tabela de perdas para o Dashboard
    nova_perda = InventoryLoss(
        item_id=item.id,
        quantidade=qtd_perda,
        valor_perda=(item.preco_custo or 0) * qtd_perda,
        motivo=data.get("motivo", "Quebra técnica"),
    )

    db.session.add(nova_perda)
    db.session.commit()

    return jsonify({"msg": "Perda registrada com sucesso"}), 200


@inventory_bp.route("/editar/<int:item_id>", methods=["PATCH"])
@jwt_required()
def editar_item(item_id):
    data = request.get_json(silent=True)
    item = InventoryItem.query.get_or_404(item_id)
    try:
        values = item_data(data, existing=item)
    except ValueError as error:
        return jsonify(msg=str(error)), 400
    for field, value in values.items():
        setattr(item, field, value)

    db.session.commit()
    return jsonify({"msg": "Inventário atualizado com sucesso!"}), 200


@inventory_bp.route("/<int:item_id>", methods=["PUT", "DELETE"], strict_slashes=False)
@jwt_required()
def gerenciar_item(item_id):
    if not is_admin():
        return jsonify({"msg": "Não autorizado"}), 403

    item = InventoryItem.query.get_or_404(item_id)

    if request.method == "DELETE":
        db.session.delete(item)
        db.session.commit()
        return jsonify({"msg": "Item removido"}), 200

    # Se for PUT (Editar)
    data = request.get_json()
    item.name = data.get("nome", item.name)
    item.quantidade = data.get("quantidade", item.quantidade)
    db.session.commit()
    return jsonify({"msg": "Item atualizado"}), 200
