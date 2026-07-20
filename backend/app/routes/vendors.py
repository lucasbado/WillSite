from flask import Blueprint, request, jsonify
from app.models import db, Vendor
from flask_jwt_extended import jwt_required

vendors_bp = Blueprint("vendors", __name__)


# ROTA PARA LISTAR (O que faz o .map() do React funcionar)
@vendors_bp.route("/", methods=["GET"])
@jwt_required()
def listar_fornecedores():
    try:
        vendors = Vendor.query.order_by(Vendor.nome).all()
        return (
            jsonify(
                [
                    {
                        "id": v.id,
                        "nome": v.nome,
                        "whatsapp": v.whatsapp,
                        "prazo_entrega": v.prazo_entrega,
                        "rating": v.rating,
                    }
                    for v in vendors
                ]
            ),
            200,
        )
    except Exception as e:
        return jsonify({"msg": f"Erro ao listar: {str(e)}"}), 500


# ROTA PARA ADICIONAR (O que resolve o erro 405)
@vendors_bp.route("/adicionar", methods=["POST"])
@jwt_required()
def adicionar_fornecedor():
    data = request.get_json()

    if not data or not data.get("nome") or not data.get("whatsapp"):
        return jsonify({"msg": "Nome e WhatsApp são obrigatórios"}), 400

    try:
        novo_v = Vendor(
            nome=data["nome"],
            whatsapp=data["whatsapp"],
            prazo_entrega=data.get("prazo_entrega", "A consultar"),
            rating=5,  # Padrão inicial
        )

        db.session.add(novo_v)
        db.session.commit()

        return jsonify({"msg": "Fornecedor integrado!", "id": novo_v.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Erro ao salvar: {str(e)}"}), 500


@vendors_bp.route("/<int:id>", methods=["PUT", "DELETE"], strict_slashes=False)
@jwt_required()
def gerenciar_fornecedor(id):
    vendor = Vendor.query.get_or_404(id)

    if request.method == "PUT":
        data = request.get_json()
        vendor.nome = data.get("nome", vendor.nome)
        vendor.whatsapp = data.get("whatsapp", vendor.whatsapp)
        vendor.prazo_entrega = data.get("prazo_entrega", vendor.prazo_entrega)
        db.session.commit()
        return jsonify({"msg": "Fornecedor atualizado com sucesso"}), 200

    if request.method == "DELETE":
        try:
            db.session.delete(vendor)
            db.session.commit()
            return jsonify({"msg": "Fornecedor removido com sucesso"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"msg": f"Erro ao remover fornecedor: {str(e)}"}), 500
