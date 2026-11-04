"""Validação compartilhada do cadastro manual de peças."""
from decimal import Decimal, InvalidOperation

from .quotes import SERVICES, key, money


def number(value, label, integer=False):
    if isinstance(value, bool):
        raise ValueError(f'{label}: informe um número válido.')
    try:
        parsed = Decimal(str(value).replace(',', '.'))
        if not parsed.is_finite() or parsed < 0 or parsed > 1000000 or (integer and parsed != parsed.to_integral_value()):
            raise ValueError()
        return int(parsed) if integer else float(parsed)
    except (InvalidOperation, ValueError):
        raise ValueError(f'{label}: informe um número entre 0 e 1.000.000' + (' sem casas decimais.' if integer else '.'))


def item_data(data, existing=None):
    if not isinstance(data, dict):
        raise ValueError('Confira os dados da peça.')
    result = {}
    for field, label, maximum, default in [('nome', 'Nome da peça', 100, ''), ('categoria', 'Categoria', 50, 'Hardware'),
            ('modelo_compativel', 'Modelo compatível', 50, 'Geral'), ('descricao', 'Descrição', 3000, '')]:
        value = data.get(field, getattr(existing, field, default) if existing else default)
        value = '' if value is None else value
        if not isinstance(value, str) or len(value.strip()) > maximum:
            raise ValueError(f'{label}: use até {maximum} caracteres.')
        value = value.strip()
        if field == 'nome' and len(value) < 2:
            raise ValueError('Informe o nome da peça com pelo menos 2 caracteres.')
        result[field] = value or default
    for field, label, default in [('quantidade', 'Quantidade', 0), ('minimo', 'Estoque mínimo', 5)]:
        result[field] = number(data.get(field, getattr(existing, field, default) if existing else default), label, integer=field == 'minimo')
    for field, label in [('preco_custo', 'Custo de compra'), ('preco_venda', 'Preço de venda')]:
        raw = data.get(field, getattr(existing, field, 0) if existing else 0)
        parsed = money(0 if raw in ('', None) else raw, allow_zero=True)
        if parsed is None:
            raise ValueError(f'{label}: informe um valor válido de até R$ 999.999,99.')
        result[field] = float(parsed)
    return result


def quote_data(data, item):
    if data is None:
        return None
    if not isinstance(data, dict) or not isinstance(data.get('service'), str) or data['service'] not in SERVICES:
        raise ValueError('Escolha o serviço para o orçamento da Cidi.')
    model = item['modelo_compativel']
    if key(model) in {'geral', 'universal', 'todos', 'outros'} or len(model) < 2:
        raise ValueError('Informe um modelo específico para ativar o orçamento da Cidi.')
    labor = money(data.get('labor_price'), allow_zero=True)
    if labor is None:
        raise ValueError('Preencha a mão de obra. Use zero apenas quando não houver cobrança.')
    if money(item['preco_venda']) is None:
        raise ValueError('Preencha o preço de venda da peça para ativar o orçamento.')
    return dict(model=model, model_key=key(model), service=data['service'], labor_price=labor, active=True)
