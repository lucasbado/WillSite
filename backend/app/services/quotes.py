"""Preços e compatibilidade vêm do cadastro; o modelo de linguagem não calcula."""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import re
import unicodedata

from .. import db
from ..models import DeviceModel, InventoryItem, RepairOffering
from .device_matching import entries, identify

SERVICES = {'tela': 'Troca de tela', 'bateria': 'Troca de bateria',
            'conector': 'Troca do conector de carga', 'tampa': 'Troca da tampa traseira'}
ISSUES = {'catalog_missing': 'Serviço/modelo sem cadastro', 'part_missing': 'Peça não vinculada ou removida',
          'out_of_stock': 'Peça sem estoque', 'part_price_missing': 'Peça sem preço de venda',
          'labor_price_missing': 'Mão de obra sem preço'}


def key(value):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', value.replace('+', ' plus ')).encode('ascii', 'ignore').decode().lower())


def aliases(value):
    result = {key(value)}
    # Só remove prefixos de marca/linha. S23 nunca equivale a S23 Ultra/Plus/FE.
    short = re.sub(r'^(?:samsung\s*|apple\s*|motorola\s*|xiaomi\s*)', '', value.strip(), flags=re.I)
    result.add(key(short))
    result.add(key(re.sub(r'^galaxy\s*', '', short, flags=re.I)))
    return result - {''}


def money(value, allow_zero=False):
    if isinstance(value, bool) or value is None or value == '':
        return None
    try:
        amount = Decimal(str(value).replace(',', '.'))
        if not amount.is_finite() or amount < 0 or amount > Decimal('999999.99') or (not allow_zero and amount == 0):
            return None
        amount = amount.quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
        return amount if allow_zero or amount > 0 else None
    except InvalidOperation:
        return None


def catalog_snapshot():
    return (RepairOffering.query.filter_by(active=True).all(), DeviceModel.query.all(),
            {item.id: item for item in InventoryItem.query.all()})


def candidates(model, service, catalog):
    query_key = key(model)
    offerings, devices, _ = catalog
    matches = []
    for offering in offerings:
        if offering.service != service:
            continue
        names = aliases(offering.model)
        for device in devices:
            if key(device.modelo) == offering.model_key or key(f'{device.marca} {device.modelo}') == offering.model_key:
                names |= aliases(device.modelo) | aliases(f'{device.marca} {device.modelo}')
                names |= {key(part) for part in re.split(r'[,;\n]', device.tags_busca or '') if part.strip()}
                if device.codigo_tecnico:
                    names.add(key(device.codigo_tecnico))
        if query_key in names:
            matches.append(offering)
    return matches


def estimate(model, service, catalog=None):
    catalog = catalog if catalog is not None else catalog_snapshot()
    match = identify(model, entries(catalog[1], catalog[0], list(catalog[2].values())))
    base = dict(model=model, service=service, service_label=SERVICES[service], currency='BRL',
                disclaimer='Estimativa sujeita à avaliação técnica e à confirmação da equipe. Não reserva peça nem horário.')
    if match['status'] in {'suggested', 'ambiguous'}:
        return {**base, 'status': 'ambiguous', 'match_type': match['status'], 'options': match['options'], 'issues': []}
    matches = candidates(model, service, catalog)
    if not matches and match['status'] == 'matched':
        matches = candidates(match['model'], service, catalog)
        base['model'] = match['model']
    if len(matches) > 1:
        return {**base, 'status': 'ambiguous', 'options': [i.model for i in matches], 'issues': []}
    if not matches:
        return {**base, 'status': 'pending', 'issues': ['catalog_missing']}
    item = matches[0]
    part = catalog[2].get(item.inventory_item_id)
    issues = []
    if part is None:
        issues.append('part_missing')
    else:
        if (part.quantidade or 0) < 1:
            issues.append('out_of_stock')
        if money(part.preco_venda) is None:
            issues.append('part_price_missing')
    if money(item.labor_price, allow_zero=True) is None:
        issues.append('labor_price_missing')
    result = {**base, 'model': item.model, 'issues': issues, 'status': 'pending' if issues else 'estimated'}
    # Um total incompleto nunca é apresentado como orçamento de reparo.
    if not issues:
        piece, labor = money(part.preco_venda), money(item.labor_price, allow_zero=True)
        result.update(part_name=part.nome, part_price=str(piece), labor_price=str(labor), total=str(piece + labor))
    return result
