from decimal import Decimal
import unittest
from unittest.mock import patch

from app import db
from app.models import InventoryItem, QuoteDemand, RepairOffering, User, WorkOrder
import test_security_delivery as existing


class RepairQuotesTests(unittest.TestCase):
    setUp = existing.SecurityDeliveryTests.setUp
    tearDown = existing.SecurityDeliveryTests.tearDown

    def offer(self, **changes):
        payload = dict(model='Samsung Galaxy S23', service='tela', inventory_item_id=1, labor_price='80,50')
        payload.update(changes)
        return self.client.post('/api/quotes/admin/catalog', json=payload, headers=self.headers[1])

    def quote(self, **changes):
        payload = dict(model='S23', service='tela')
        payload.update(changes)
        return self.client.post('/api/quotes/estimate', json=payload, headers=self.headers[2])

    def alerts(self):
        return self.client.get('/api/quotes/admin/alerts', headers=self.headers[1]).json

    def test_price_uses_sale_plus_labor_and_never_client_values_or_cost(self):
        self.assertEqual(self.offer().status_code, 201)
        with patch('app.services.assistant.requests.post') as provider:
            result = self.quote(total='0.01', labor_price='0', part_price='1').json
            provider.assert_not_called()
        self.assertEqual(result['status'], 'estimated')
        self.assertEqual(result['total'], '130.50')
        self.assertEqual(result['part_price'], '50.00')
        self.assertNotIn('preco_custo', str(result))
        self.assertNotIn('quantidade', str(result))
        self.assertNotIn('inventory_item_id', str(result))
        self.assertEqual(db.session.get(InventoryItem, 1).quantidade, 2)
        self.assertEqual(WorkOrder.query.count(), 2)

    def test_missing_fields_never_emit_incomplete_total_and_alerts_auto_resolve(self):
        created = self.offer(labor_price='', inventory_item_id=2)
        result = self.quote().json
        self.assertEqual(result['status'], 'pending')
        self.assertIn('out_of_stock', result['issues'])
        self.assertIn('labor_price_missing', result['issues'])
        self.assertNotIn('total', result)
        self.assertTrue(result['team_notified'])
        pending = self.alerts()['alerts']
        self.assertEqual(len(pending), 1)
        part = db.session.get(InventoryItem, 2)
        part.quantidade = 2
        db.session.get(RepairOffering, created.json['id']).labor_price = Decimal('0')
        db.session.commit()
        self.assertEqual(self.alerts()['alerts'], [])
        self.assertEqual(self.quote().json['total'], '30.00')

    def test_zero_price_and_removed_part_create_different_pending_reasons(self):
        self.offer()
        part = db.session.get(InventoryItem, 1)
        part.preco_venda = 0
        db.session.commit()
        self.assertEqual(self.quote().json['issues'], ['part_price_missing'])
        self.assertEqual(self.alerts()['unpriced_parts'][0]['id'], 1)
        db.session.delete(part)
        db.session.commit()
        self.assertEqual(self.quote().json['issues'], ['part_missing'])

    def test_unknown_service_model_records_one_demand_but_not_for_visitors(self):
        for _ in range(3):
            result = self.quote().json
            self.assertEqual(result['issues'], ['catalog_missing'])
        self.assertEqual(QuoteDemand.query.count(), 1)
        self.client.post('/api/quotes/estimate', json={'model': 'S24', 'service': 'bateria'})
        self.assertEqual(QuoteDemand.query.count(), 1)
        self.offer()
        self.assertEqual(self.alerts()['alerts'], [])
        db.session.get(InventoryItem, 1).quantidade = 0
        db.session.commit()
        self.quote()
        self.assertEqual(QuoteDemand.query.count(), 2)
        self.assertEqual(len(self.alerts()['alerts']), 1)

    def test_variant_matching_never_prices_ultra_plus_or_fe_as_base(self):
        self.offer()
        for name in ['S23 Ultra', 'S23+', 'S23 Plus', 'S23 FE', 'S230']:
            self.assertEqual(self.quote(model=name).json['status'], 'pending', name)
        self.offer(model='Samsung Galaxy S23 Plus', labor_price=100)
        self.assertEqual(self.quote(model='S23+').json['total'], '150.00')

    def test_ambiguous_brand_requires_exact_model_without_creating_demand(self):
        self.offer(model='Samsung A15')
        self.offer(model='Motorola A15')
        response = self.quote(model='A15').json
        self.assertEqual(response['status'], 'ambiguous')
        self.assertNotIn('total', response)
        self.assertEqual(QuoteDemand.query.count(), 0)
        self.assertEqual(self.quote(model='Samsung A15').json['status'], 'estimated')

    def test_admin_authorization_uses_current_database_role(self):
        for path in ['/api/quotes/admin/catalog', '/api/quotes/admin/alerts']:
            self.assertEqual(self.client.get(path).status_code, 401)
            self.assertEqual(self.client.get(path, headers=self.headers[2]).status_code, 403)
        db.session.get(User, 1).role = 'cliente'
        db.session.commit()
        self.assertEqual(self.offer().status_code, 403)

    def test_catalog_validation_and_inactive_offering(self):
        for changes in [dict(labor_price=-1), dict(labor_price='NaN'), dict(labor_price=True), dict(inventory_item_id=999), dict(inventory_item_id=True), dict(model=''), dict(service='placa')]:
            self.assertEqual(self.offer(**changes).status_code, 400)
        created = self.offer()
        self.assertEqual(self.offer().status_code, 409)
        response = self.client.put(f"/api/quotes/admin/catalog/{created.json['id']}", json=dict(model='Samsung Galaxy S23', service='tela', labor_price=50, inventory_item_id=1, active=False), headers=self.headers[1])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.quote().json['status'], 'pending')
        self.assertEqual(self.quote(service='desconhecido').status_code, 400)
        self.assertEqual(self.quote(service=[]).status_code, 400)
        self.assertEqual(self.offer(service=[]).status_code, 400)


if __name__ == '__main__':
    unittest.main()
