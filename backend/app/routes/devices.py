from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

# IMPORTANTE: Adicione o or_ aqui
from sqlalchemy import or_
from ..models import db, DeviceModel

devices_bp = Blueprint("devices", __name__)


@devices_bp.route("/listar", methods=["GET"])
def listar_modelos():
    modelos = DeviceModel.query.order_by(DeviceModel.marca, DeviceModel.modelo).all()
    # Use to_dict() aqui também para manter o padrão se quiser
    return jsonify([m.to_dict() for m in modelos]), 200


@devices_bp.route("/adicionar", methods=["POST"])
@jwt_required()
def adicionar_modelo():
    data = request.get_json()

    # Verifica se o modelo já existe
    existente = DeviceModel.query.filter_by(modelo=data.get("modelo")).first()
    if existente:
        return jsonify({"msg": "Este modelo já está cadastrado!"}), 400

    novo = DeviceModel(
        marca=data.get("marca"),
        modelo=data.get("modelo"),
        codigo_tecnico=data.get("codigo_tecnico"),  # Garanta que está recebendo isso
    )
    db.session.add(novo)
    db.session.commit()
    return jsonify({"msg": "Modelo cadastrado com sucesso!", "id": novo.id}), 201


@devices_bp.route("/<int:id>", methods=["DELETE"], strict_slashes=False)
@jwt_required()
def remover_modelo(id):
    modelo = DeviceModel.query.get_or_404(id)
    try:
        db.session.delete(modelo)
        db.session.commit()
        return jsonify({"msg": "Modelo removido!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Erro ao remover. Pode estar vinculado a uma OS."}), 400


# Removi a linha duplicada que estava aqui
@devices_bp.route("/sugestao", methods=["GET"])
def buscar_sugestoes():
    termo = request.args.get("q", "").strip()

    if len(termo) < 2:
        return jsonify([])

    # Agora o or_ vai funcionar!
    sugestoes = (
        DeviceModel.query.filter(
            or_(
                DeviceModel.modelo.ilike(f"%{termo}%"),
                DeviceModel.marca.ilike(f"%{termo}%"),
                DeviceModel.codigo_tecnico.ilike(f"%{termo}%"),
            )
        )
        .limit(5)
        .all()
    )

    return jsonify([s.to_dict() for s in sugestoes])
