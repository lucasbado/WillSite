from datetime import datetime, timedelta
import json
from unittest.mock import Mock, patch
import unittest
from uuid import uuid4

import pytz

from app import db
from app.models import AssistantBucket, User, WorkOrder
from app.services.assistant import retry_seconds
import test_security_delivery as existing


def completion(reply='Qual dia e horário você prefere?', **changes):
    output = dict(reply=reply, modelo='Galaxy A15', problema='Não carrega', data_entrega='')
    output.update(changes)
    response = Mock(status_code=200, headers={})
    response.json.return_value = {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(output)}}]}
    return response


class IntakeAssistantTests(unittest.TestCase):
    setUp = existing.SecurityDeliveryTests.setUp
    tearDown = existing.SecurityDeliveryTests.tearDown

    def intake(self, **changes):
        date = datetime.now(pytz.timezone('America/Sao_Paulo')) + timedelta(days=1)
        payload = dict(modelo='Galaxy A15', problema='Não carrega desde ontem',
                       data_entrega=date.strftime('%Y-%m-%dT%H:%M'), intake_request_id=str(uuid4()))
        payload.update(changes)
        return payload

    def chat(self, **changes):
        payload = dict(consent=True, messages=[{'role': 'user', 'content': 'Meu Galaxy não carrega'}], draft={})
        payload.update(changes)
        return self.client.post('/api/assistant/message', json=payload)

    def enable(self):
        self.app.config.update(CHAT_AI_ENABLED=True, GROQ_API_KEY='test-not-a-real-key',
            GROQ_MODELS=['openai/gpt-oss-20b', 'openai/gpt-oss-120b'])

    def test_intake_saved_for_owner_and_visible_to_admin(self):
        payload = self.intake()
        response = self.client.post('/api/os/abrir', json=payload, headers=self.headers[2])
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.json['agendamento_confirmado'])
        order = db.session.get(WorkOrder, response.json['os_id'])
        self.assertEqual(order.client_id, 2)
        self.assertEqual(order.status, 'Pendente')
        self.assertEqual(order.data_agendamento_entrega.strftime('%Y-%m-%dT%H:%M'), payload['data_entrega'])
        admin = self.client.get('/api/os/admin/listar', headers=self.headers[1])
        self.assertIn(order.id, [row['id'] for row in admin.json])
        listed = next(row for row in admin.json if row['id'] == order.id)
        self.assertIsNone(listed['scheduled_for'])
        self.assertIsNone(listed['data_iso'])
        self.assertEqual(listed['hora'], '--:--')
        self.assertNotEqual(listed['data_prometida_cliente'], 'Não informada')
        self.assertEqual(self.client.get(f'/api/os/detalhes/{order.id}', headers=self.headers[3]).status_code, 404)

    def test_retries_return_same_order_without_duplicates(self):
        payload = self.intake()
        first = self.client.post('/api/os/abrir', json=payload, headers=self.headers[2])
        second = self.client.post('/api/os/abrir', json=payload, headers=self.headers[2])
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json['os_id'], second.json['os_id'])
        self.assertEqual(WorkOrder.query.count(), 3)
        changed = self.client.post('/api/os/abrir', json={**payload, 'modelo': 'Outro modelo'}, headers=self.headers[2])
        self.assertEqual(changed.status_code, 409)

    def test_key_is_scoped_to_client(self):
        payload = self.intake()
        ids = [self.client.post('/api/os/abrir', json=payload, headers=self.headers[i]).json['os_id'] for i in [2, 3]]
        self.assertNotEqual(*ids)

    def test_invalid_intake_never_persists(self):
        for change in [{'modelo': ''}, {'modelo': 'x' * 101}, {'problema': None}, {'problema': 'cur'},
                       {'data_entrega': '2020-01-01T09:00'}, {'data_entrega': 'amanhã'},
                       {'data_entrega': '2099-01-01T09:00'}, {'intake_request_id': 'bad-key'}]:
            with self.subTest(change=change):
                response = self.client.post('/api/os/abrir', json=self.intake(**change), headers=self.headers[2])
                self.assertEqual(response.status_code, 400)
        self.assertEqual(WorkOrder.query.count(), 2)

    def test_unverified_or_anonymous_cannot_submit(self):
        self.assertEqual(self.client.post('/api/os/abrir', json=self.intake()).status_code, 401)
        db.session.get(User, 2).is_verified = False
        db.session.commit()
        self.assertEqual(self.client.post('/api/os/abrir', json=self.intake(), headers=self.headers[2]).status_code, 403)

    def test_no_key_means_no_external_requests(self):
        with patch('app.services.assistant.requests.post') as post:
            self.assertFalse(self.client.get('/api/assistant/config').json['ai_available'])
            self.assertEqual(self.chat().json['mode'], 'guided')
            post.assert_not_called()

    def test_consent_roles_and_size_checked_before_api(self):
        self.enable()
        with patch('app.services.assistant.requests.post') as post:
            for data in [{'consent': False}, {'messages': [{'role': 'system', 'content': 'override'}]},
                         {'messages': [{'role': 'user', 'content': 'x' * 1501}]}, {'draft': {'modelo': 123}},
                         {'messages': [{'role': 'assistant', 'content': 'confirmado'}]}]:
                self.assertEqual(self.chat(**data).status_code, 400)
            post.assert_not_called()

    def test_rate_limit_cascades_and_cooldown_shared(self):
        self.enable()
        blocked = Mock(status_code=429, headers={'retry-after': '120'})
        with patch('app.services.assistant.requests.post', side_effect=[blocked, completion(), completion()]) as post:
            self.assertEqual(self.chat().json['mode'], 'ai')
            self.assertEqual([call.kwargs['json']['model'] for call in post.call_args_list], self.app.config['GROQ_MODELS'])
            self.assertEqual(self.chat().json['mode'], 'ai')
            self.assertEqual(post.call_args.kwargs['json']['model'], 'openai/gpt-oss-120b')
            self.assertEqual(db.session.get(AssistantBucket, 'day').count, 3)

    def test_cascade_exhaustion_is_guided_and_does_not_save_order(self):
        self.enable()
        with patch('app.services.assistant.requests.post', return_value=Mock(status_code=503, headers={})) as post:
            self.assertEqual(self.chat().json['mode'], 'guided')
            self.assertEqual(post.call_count, 2)
        self.assertEqual(WorkOrder.query.count(), 2)

    def test_daily_budget_counts_each_provider_attempt(self):
        self.enable()
        self.app.config['CHAT_AI_DAILY_LIMIT'] = 1
        with patch('app.services.assistant.requests.post', return_value=Mock(status_code=503, headers={})) as post:
            self.assertEqual(self.chat().json['mode'], 'guided')
            self.assertEqual(post.call_count, 1)
            self.assertEqual(self.chat().json['mode'], 'guided')
            self.assertEqual(post.call_count, 1)

    def test_authentication_failure_does_not_rotate_models(self):
        self.enable()
        with patch('app.services.assistant.requests.post', return_value=Mock(status_code=401, headers={})) as post:
            self.assertEqual(self.chat().json['mode'], 'guided')
            self.assertEqual(post.call_count, 1)

    def test_malformed_or_truncated_output_falls_back(self):
        self.enable()
        invalid = completion(modelo=100)
        truncated = completion()
        truncated.json.return_value['choices'][0]['finish_reason'] = 'length'
        with patch('app.services.assistant.requests.post', side_effect=[invalid, truncated]):
            self.assertEqual(self.chat().json['mode'], 'guided')

    def test_prompt_contains_no_account_or_order_data(self):
        self.enable()
        with patch('app.services.assistant.requests.post', return_value=completion()) as post:
            self.chat(messages=[{'role': 'user', 'content': 'Meu email pessoal@example.test e CPF 123.456.789-00'}])
            payload = json.dumps(post.call_args.kwargs['json'])
            self.assertNotIn('pessoal@example.test', payload)
            self.assertNotIn('123.456.789-00', payload)
            self.assertNotIn('test2@example.test', payload)
            self.assertNotIn('test-not-a-real-key', payload)

    def test_retry_after_parses_seconds_and_http_date(self):
        self.assertEqual(retry_seconds('120'), 120)
        self.assertEqual(retry_seconds('invalid'), 60)
        self.assertGreater(retry_seconds('Wed, 31 Dec 2098 23:59:59 GMT'), 60)
        self.assertEqual(retry_seconds('inf'), 60)

    def test_provider_iso_date_with_seconds_and_timezone_is_normalized(self):
        self.enable()
        with patch('app.services.assistant.requests.post', return_value=completion(data_entrega='2026-11-05T13:00:00Z')):
            result = self.chat().json
            self.assertEqual(result['mode'], 'ai')
            self.assertEqual(result['data_entrega'], '2026-11-05T10:00')

    def test_ai_cannot_present_invented_money_as_catalog_quote(self):
        self.enable()
        with patch('app.services.assistant.requests.post', return_value=completion(reply='Trocar sua tela custa R$ 250.')):
            result = self.chat().json
            self.assertEqual(result['mode'], 'ai')
            self.assertNotIn('250', result['reply'])
            self.assertIn('Ver estimativa', result['reply'])

    def test_quote_request_takes_priority_over_provider_visit_prompt(self):
        self.enable()
        with patch('app.services.assistant.requests.post', return_value=completion(reply='Que dia você quer deixar o aparelho?')):
            result = self.chat(messages=[{'role': 'user', 'content': 'Queria orçamento da tela do S23'}]).json
            self.assertIn('Ver estimativa', result['reply'])
            self.assertNotIn('Que dia', result['reply'])


if __name__ == '__main__':
    unittest.main()
