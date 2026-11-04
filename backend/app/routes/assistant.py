from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from .. import db
from ..services.assistant import enabled, respond

assistant_bp = Blueprint('assistant', __name__)


@assistant_bp.get('/config')
def config():
    return jsonify(ai_available=enabled(), provider='Groq' if enabled() else None)


@assistant_bp.post('/message')
def message():
    if request.content_length and request.content_length > 18000:
        return jsonify(msg='Conversa muito longa. Inicie um novo atendimento.'), 413
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or data.get('consent') is not True:
        return jsonify(msg='Autorize o envio das mensagens à IA ou use o atendimento guiado.'), 400
    messages = data.get('messages')
    draft = data.get('draft', {})
    if not isinstance(messages, list) or not 1 <= len(messages) <= 12 or not isinstance(draft, dict):
        return jsonify(msg='Conversa inválida'), 400
    for item in messages:
        if not isinstance(item, dict) or item.get('role') not in {'user', 'assistant'} or not isinstance(item.get('content'), str) or not 1 <= len(item['content']) <= 1500:
            return jsonify(msg='Mensagem inválida'), 400
    if messages[-1]['role'] != 'user' or any(not isinstance(draft.get(key, ''), str) or len(draft.get(key, '')) > maximum
            for key, maximum in [('modelo', 100), ('problema', 3000), ('data_entrega', 16)]):
        return jsonify(msg='Dados inválidos'), 400
    if not enabled():
        return jsonify(mode='guided', reason='unavailable')
    try:
        result = respond(messages, draft)
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.warning('Assistente indisponível; seguindo no modo guiado')
        result = None
    if result:
        return jsonify(mode='ai', **result)
    return jsonify(mode='guided', reason='unavailable')
