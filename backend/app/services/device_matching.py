"""Identificação local baseada no cadastro atual, sem lista fixa de aparelhos."""
from difflib import SequenceMatcher
import re
import unicodedata

from ..models import DeviceModel, InventoryItem, RepairOffering

BRANDS = ('Samsung', 'Apple', 'Motorola', 'Xiaomi', 'Google', 'Realme', 'Asus', 'Oppo',
          'Nokia', 'Huawei', 'Honor', 'OnePlus', 'LG', 'Sony', 'Lenovo', 'Infinix', 'Tecno')
VARIANTS = {'plus', 'ultra', 'pro', 'max', 'mini', 'fe', 'lite', 'neo', 'power', 'fusion', 'play', 'prime', 'xl', 'se'}


def words(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower().replace('+', ' plus ')
    value = re.sub(r'(?<=[a-z])(?=\d)', ' ', value)
    value = re.sub(r'(?<=\d)(?=[a-z])', ' ', value)
    return ' '.join(re.findall(r'[a-z0-9]+', value))


def compact(value):
    return words(value).replace(' ', '')


def signature(value):
    normalized = words(value)
    series = tuple(re.findall(r'\b([a-z]{1,2})\s+\d+', normalized))
    return tuple(re.findall(r'\d+', value)), frozenset(normalized.split()) & VARIANTS, series


def entries(devices=None, offerings=None, inventory=None):
    devices = DeviceModel.query.all() if devices is None else devices
    offerings = RepairOffering.query.filter_by(active=True).all() if offerings is None else offerings
    inventory = InventoryItem.query.all() if inventory is None else inventory
    brands = sorted(set(BRANDS) | {d.marca for d in devices if d.marca}, key=len, reverse=True)
    result = {}

    def add(name, brand='', extra=()):
        name = name.strip()
        if not name or words(name) in {'geral', 'universal', 'todos', 'outros'}:
            return
        normalized = words(name)
        brand = brand or next((b for b in brands if normalized.startswith(words(b) + ' ')), '')
        if not brand and normalized.startswith('galaxy '):
            brand = 'Samsung'
        if not brand and normalized.startswith('iphone '):
            brand = 'Apple'
        short = normalized
        if brand and short.startswith(words(brand) + ' '):
            short = short[len(words(brand)) + 1:]
        core = re.sub(r'^(?:galaxy|moto) ', '', short)
        identity = (words(brand), core)
        label = name if not brand or normalized.startswith(words(brand) + ' ') else f'{brand} {name}'
        if len(label) > 100:
            label = name
        item = result.setdefault(identity, dict(model=label, brand=brand, core=core, aliases=set(), forms=set()))
        brand_names = {words(b) for b in brands}
        forms = {words(alias) for alias in [label, name, short, core, f'{brand} {core}', *extra] if alias and words(alias) not in brand_names}
        item['forms'] |= forms
        item['aliases'] |= {compact(alias) for alias in forms}

    for device in devices:
        add(device.modelo, device.marca, [device.codigo_tecnico] + re.split(r'[,;\n]', device.tags_busca or ''))
    for offering in offerings:
        add(offering.model)
    for part in inventory:
        compatibility = part.modelo_compativel or ''
        for name in re.split(r'[,;\n]', compatibility):
            add(name)
        if not compatibility.strip() or words(compatibility) in {'geral', 'universal', 'todos', 'outros'}:
            # Cadastros antigos às vezes só informam o aparelho no nome da peça.
            # Isto identifica o texto; não atribui compatibilidade nem preço.
            name = re.sub(r'^(?:tela|bateria|display|touch|frontal|conector(?: de carga)?|tampa(?: traseira)?)\s+(?:(?:lcd|oled|amoled)\s+)?(?:para\s+)?', '', part.nome, flags=re.I).strip()
            if name != part.nome and (re.search(r'\d', name) or re.fullmatch(r'iphone\s+(?:x|xr|xs|se)(?:\s+max)?', name, re.I)):
                add(name)
    # Um cadastro sem marca pode ser o mesmo aparelho já cadastrado com marca.
    for identity, item in list(result.items()):
        if item['brand']:
            continue
        matches = [other for other in result.values() if other['brand'] and compact(item['model']) in other['aliases']]
        if len(matches) == 1:
            matches[0]['aliases'] |= item['aliases']
            matches[0]['forms'] |= item['forms']
            del result[identity]
    return list(result.values())


def identify(value, registry=None):
    registry = entries() if registry is None else registry
    query = compact(value)
    brands = {compact(b) for b in BRANDS} | {compact(item['brand']) for item in registry if item['brand']}
    if len(query) < 2 or query in brands:
        return dict(status='unknown', model=value, options=[])
    exact = [item for item in registry if query in item['aliases']]
    if len(exact) == 1:
        return dict(status='matched', model=exact[0]['model'], options=[])
    if exact:
        return dict(status='ambiguous', model=value, options=sorted({item['model'] for item in exact}))
    ranked = []
    for item in registry:
        score = 0
        for form in item['forms']:
            alias = compact(form)
            # Nunca transforma A15 em A16, nem uma versão base em Ultra/Plus.
            if signature(value) != signature(form):
                continue
            if min(len(query), len(alias)) < 4:
                continue
            score = max(score, SequenceMatcher(None, query, alias).ratio())
        if score >= .76:
            ranked.append((score, item['model']))
    if ranked:
        ranked.sort(reverse=True)
        options = sorted({label for score, label in ranked if score >= ranked[0][0] - .08})[:5]
        return dict(status='suggested', model=value, options=options)
    # Versão incompleta: oferece escolhas, sem assumir qual delas o cliente possui.
    partial = [item['model'] for item in registry if any(
        form.startswith(words(value) + ' ') for form in item['forms'])]
    if partial:
        return dict(status='suggested', model=value, options=sorted(set(partial))[:5])
    return dict(status='unknown', model=value, options=[])
