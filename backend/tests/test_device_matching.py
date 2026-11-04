import unittest
from unittest.mock import patch

from app import db
from app.models import DeviceModel, InventoryItem, RepairOffering
from app.services.device_matching import identify
from test_intake_assistant import completion
import test_security_delivery as existing


class DeviceMatchingTests(unittest.TestCase):
    setUp = existing.SecurityDeliveryTests.setUp
    tearDown = existing.SecurityDeliveryTests.tearDown

    def device(self, brand='Samsung', model='Galaxy S23', **extra):
        item = DeviceModel(marca=brand, modelo=model, **extra)
        db.session.add(item); db.session.commit()
        return item

    def test_brandless_spacing_case_codes_and_registered_aliases(self):
        self.device(codigo_tecnico='SM-S911', tags_busca='samsungzinho, meu-galaxy, Samsung')
        for value in ['s23', 'S 23', 'galaxy s23', 'Samsung S23', 'Samsung Galaxy S23', 'SM-S911', 'samsungzinho']:
            result = identify(value)
            self.assertEqual(result['status'], 'matched', value)
            self.assertEqual(result['model'], 'Samsung Galaxy S23')
        self.assertEqual(identify('Samsung')['status'], 'unknown')

    def test_new_brand_and_model_enter_without_code_change_or_restart(self):
        self.assertEqual(identify('Z99 Max')['status'], 'unknown')
        self.device('Marca Nova', 'Z99 Max')
        self.assertEqual(identify('Z99 Max')['model'], 'Marca Nova Z99 Max')
        self.device('Outra Marca', 'Outra Marca Z99 Max')
        result = identify('Z99 Max')
        self.assertEqual(result['status'], 'ambiguous')
        self.assertEqual(len(result['options']), 2)

    def test_fuzzy_text_requires_confirmation_and_does_not_change_model_numbers(self):
        self.device()
        for value in ['galaxi s23', 'samsumg galaxy s23', 'galax s23']:
            result = identify(value)
            self.assertEqual(result['status'], 'suggested', value)
            self.assertEqual(result['options'], ['Samsung Galaxy S23'])
        for value in ['S24', 'S230', 'A23', 'S23 Ultra', 'S23+', 'S23 FE']:
            self.assertEqual(identify(value)['status'], 'unknown', value)

    def test_iphone_typo_and_variant_are_kept_separate(self):
        self.device('Apple', 'iPhone 13 Pro Max')
        self.assertEqual(identify('iphone13promax')['status'], 'matched')
        self.assertEqual(identify('ifone 13 pro max')['status'], 'suggested')
        self.assertEqual(identify('iphone 13 pro')['status'], 'suggested')
        self.assertEqual(identify('iphone 12 pro max')['status'], 'unknown')

    def test_incomplete_variant_gets_choices_instead_of_price(self):
        self.device(model='Galaxy A15 4G')
        self.device(model='Galaxy A15 5G')
        result = identify('A15')
        self.assertEqual(result['status'], 'suggested')
        self.assertEqual(len(result['options']), 2)
        self.assertEqual(identify('A15 5G')['model'], 'Samsung Galaxy A15 5G')

    def test_catalog_and_inventory_models_also_join_the_registry(self):
        db.session.add(RepairOffering(model='Motorola Moto G24', model_key='motorolamotog24', service='tela', active=True))
        db.session.get(InventoryItem, 1).modelo_compativel = 'Xiaomi Redmi Note 13'
        db.session.commit()
        self.assertEqual(identify('G24')['model'], 'Motorola Moto G24')
        self.assertEqual(identify('Redmi Note 13')['model'], 'Xiaomi Redmi Note 13')

    def test_legacy_part_name_can_identify_but_never_implies_compatibility_or_quote(self):
        part = db.session.get(InventoryItem, 1)
        part.nome = 'Bateria S23'
        part.modelo_compativel = 'Geral'
        db.session.commit()
        self.assertEqual(identify('s23')['status'], 'matched')
        quote = self.client.post('/api/quotes/estimate', json={'model':'S23','service':'bateria'}).json
        self.assertEqual(quote['status'], 'pending')
        self.assertNotIn('total', quote)
        self.assertEqual(part.modelo_compativel, 'Geral')

    def test_same_device_in_multiple_tables_is_not_ambiguous(self):
        self.device()
        db.session.add(RepairOffering(model='Samsung S23', model_key='samsungs23', service='tela', active=True))
        db.session.get(InventoryItem, 1).modelo_compativel = 'S23'
        db.session.commit()
        self.assertEqual(identify('S23')['status'], 'matched')

    def test_quote_never_uses_fuzzy_price_until_model_is_confirmed(self):
        self.device()
        db.session.add(RepairOffering(model='Samsung Galaxy S23', model_key='samsunggalaxys23', service='tela', inventory_item_id=1, labor_price=80, active=True))
        db.session.commit()
        result = self.client.post('/api/quotes/estimate', json={'model':'galaxi s23','service':'tela'}).json
        self.assertEqual(result['status'], 'ambiguous')
        self.assertNotIn('total', result)
        result = self.client.post('/api/quotes/estimate', json={'model':result['options'][0],'service':'tela'}).json
        self.assertEqual(result['total'], '130.00')

    def test_assistant_uses_local_identity_even_when_provider_asks_brand_again(self):
        self.device()
        self.app.config.update(CHAT_AI_ENABLED=True, GROQ_API_KEY='test-key', GROQ_MODELS=['openai/gpt-oss-20b'])
        with patch('app.services.assistant.requests.post', return_value=completion(reply='Qual a marca?', modelo='S23')) as provider:
            result = self.client.post('/api/assistant/message', json={'consent':True,'draft':{},'messages':[{'role':'user','content':'S23'}]}).json
            self.assertEqual(result['modelo'], 'Samsung Galaxy S23')
            self.assertNotIn('Qual a marca', result['reply'])
            context = provider.call_args.kwargs['json']['messages'][1]['content']
            self.assertIn('Samsung Galaxy S23', context)

    def test_quote_intent_preserves_question_to_confirm_similar_model(self):
        self.device()
        self.app.config.update(CHAT_AI_ENABLED=True, GROQ_API_KEY='test-key', GROQ_MODELS=['openai/gpt-oss-20b'])
        with patch('app.services.assistant.requests.post', return_value=completion(modelo='galaxi s23')):
            result = self.client.post('/api/assistant/message', json={'consent':True,'draft':{},'messages':[{'role':'user','content':'Queria orçamento do galaxi s23'}]}).json
            self.assertEqual(result['model_match']['options'], ['Samsung Galaxy S23'])
            self.assertIn('Escolha abaixo', result['reply'])

    def test_model_endpoint_validates_length(self):
        self.device()
        self.assertEqual(self.client.get('/api/devices/identificar?q=s23').json['status'], 'matched')
        self.assertEqual(self.client.get('/api/devices/identificar?q=x').status_code, 400)


if __name__ == '__main__':
    unittest.main()
