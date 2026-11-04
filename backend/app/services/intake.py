"""Validação do primeiro atendimento, independente do modelo de conversa."""
from datetime import datetime, timedelta
from uuid import UUID

import pytz

from .delivery import DeliveryError


def intake_payload(data):
    if not isinstance(data, dict):
        raise DeliveryError('Envie um objeto JSON válido')
    result = {}
    for name, minimum, maximum in [('modelo', 2, 100), ('problema', 5, 3000)]:
        value = data.get(name)
        if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
            raise DeliveryError(f'Informe {name} entre {minimum} e {maximum} caracteres')
        result[name] = value.strip()
    key = data.get('intake_request_id')
    if key is not None:
        try:
            result['intake_request_id'] = str(UUID(key))
        except (ValueError, TypeError, AttributeError):
            raise DeliveryError('Identificador da solicitação inválido') from None
    else:
        result['intake_request_id'] = None
    raw = data.get('data_entrega')
    if not raw and (data.get('data_entrega_dia') or data.get('data_entrega_hora')):
        raw = f"{data.get('data_entrega_dia', '')}T{data.get('data_entrega_hora', '')}"
    if not raw:
        result['date'] = None
        return result
    try:
        if not isinstance(raw, str) or len(raw) != 16:
            raise ValueError()
        date = datetime.strptime(raw, '%Y-%m-%dT%H:%M')
    except (ValueError, TypeError):
        raise DeliveryError('Informe uma data e um horário válidos') from None
    now = datetime.now(pytz.timezone('America/Sao_Paulo')).replace(tzinfo=None)
    if date <= now or date > now + timedelta(days=90):
        raise DeliveryError('Escolha um horário futuro nos próximos 90 dias')
    result['date'] = date
    return result
