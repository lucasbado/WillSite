"""Autorização central: permissões atuais do banco e isolamento por cliente."""
from flask import g, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from . import db
from .models import User, WorkOrder


def enforce_access():
    if request.method == "OPTIONS" or not request.endpoint:
        return None
    blueprint = request.blueprint
    admin_route = (
        (blueprint in {"auth", "os"} and "/admin/" in request.path)
        or blueprint in {"inventory", "vendors"}
        or (blueprint == "devices" and request.method != "GET")
        or request.endpoint in {"os.definir_pronto_retirada", "os.finalizar_os"}
    )
    if not admin_route and blueprint != "os":
        return None
    verify_jwt_in_request()
    identity = get_jwt_identity()
    if not isinstance(identity, str) or not identity.isdecimal():
        return jsonify(msg="Sessão inválida"), 401
    user = db.session.get(User, int(identity))
    if not user:
        return jsonify(msg="Sessão inválida"), 401
    g.current_user = user
    if admin_route and user.role != "admin":
        return jsonify(msg="Acesso negado"), 403
    os_id = (request.view_args or {}).get("os_id")
    if blueprint == "os" and os_id is not None:
        order = db.session.get(WorkOrder, os_id)
        if not order or order.deletada or (user.role != "admin" and order.client_id != user.id):
            return jsonify(msg="OS não encontrada"), 404


def accessible_order(os_id, lock=False):
    query = WorkOrder.query.filter_by(id=os_id, deletada=False)
    if g.current_user.role != "admin":
        query = query.filter_by(client_id=g.current_user.id)
    if lock:
        query = query.populate_existing().with_for_update()
    return query.first_or_404()
