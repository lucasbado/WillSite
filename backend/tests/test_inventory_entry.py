import unittest

from app import db
from app.models import InventoryItem, RepairOffering
import test_security_delivery as existing


class InventoryEntryTests(unittest.TestCase):
    setUp = existing.SecurityDeliveryTests.setUp
    tearDown = existing.SecurityDeliveryTests.tearDown

    def add(self, **changes):
        payload = dict(nome='Bateria Samsung Galaxy S23', modelo_compativel='Samsung Galaxy S23',
            quantidade=5, preco_venda='150,00', categoria='Hardware')
        payload.update(changes)
        return self.client.post('/api/estoque/adicionar', json=payload, headers=self.headers[1])

    def test_one_form_creates_part_and_working_quote_with_decimal_comma(self):
        response = self.add(quote={'service':'bateria', 'labor_price':'120,00'})
        self.assertEqual(response.status_code, 201)
        part = db.session.get(InventoryItem, response.json['id'])
        self.assertEqual(part.quantidade, 5)
        offering = RepairOffering.query.one()
        self.assertEqual(offering.inventory_item_id, part.id)
        quote = self.client.post('/api/quotes/estimate', json={'model':'S23','service':'bateria'}).json
        self.assertEqual(quote['total'], '270.00')

    def test_bad_quote_never_saves_a_partial_part(self):
        for quote in [{'service':'bateria','labor_price':''}, {'service':'invalid','labor_price':120},
                      {'service':[],'labor_price':120}, {'service':'bateria','labor_price':'NaN'}]:
            self.assertEqual(self.add(quote=quote).status_code, 400)
        self.assertEqual(self.add(modelo_compativel='Geral', quote={'service':'bateria','labor_price':120}).status_code, 400)
        self.assertEqual(self.add(preco_venda=0, quote={'service':'bateria','labor_price':120}).status_code, 400)
        self.assertEqual(InventoryItem.query.count(), 2)
        self.assertEqual(RepairOffering.query.count(), 0)

    def test_existing_quote_cannot_be_replaced_silently_or_duplicate_part(self):
        first = self.add(quote={'service':'bateria','labor_price':120})
        second = self.add(nome='Outra bateria S23', quote={'service':'bateria','labor_price':90})
        self.assertEqual(second.status_code, 409)
        self.assertEqual(InventoryItem.query.count(), 3)
        self.assertEqual(RepairOffering.query.one().inventory_item_id, first.json['id'])
        self.assertEqual(float(RepairOffering.query.one().labor_price), 120)

    def test_plain_part_can_be_added_without_quote_or_price(self):
        response = self.add(modelo_compativel='', preco_venda='', preco_custo='')
        self.assertEqual(response.status_code, 201)
        part = db.session.get(InventoryItem, response.json['id'])
        self.assertEqual(part.modelo_compativel, 'Geral')
        self.assertEqual(part.preco_venda, 0)
        self.assertEqual(RepairOffering.query.count(), 0)

    def test_invalid_stock_or_prices_never_persist(self):
        for change in [dict(nome=''), dict(quantidade=-1), dict(quantidade=True), dict(quantidade='NaN'),
                       dict(preco_custo='Infinity'), dict(preco_venda=-1), dict(minimo=1.5),
                       dict(modelo_compativel='x'*51), dict(categoria=[]), dict(preco_venda=True)]:
            self.assertEqual(self.add(**change).status_code, 400, change)
        self.assertEqual(InventoryItem.query.count(), 2)
        self.assertEqual(self.client.post('/api/estoque/adicionar', json=[], headers=self.headers[1]).status_code, 400)

    def test_edit_preserves_other_fields_and_accepts_comma(self):
        response = self.client.patch('/api/estoque/editar/1', json={'preco_venda':'150,50','minimo':0}, headers=self.headers[1])
        self.assertEqual(response.status_code, 200)
        part = db.session.get(InventoryItem, 1)
        self.assertEqual(part.preco_venda, 150.5)
        self.assertEqual(part.quantidade, 2)
        self.assertEqual(part.minimo, 0)
        self.assertEqual(self.client.patch('/api/estoque/editar/1', json={'preco_venda':-1}, headers=self.headers[1]).status_code, 400)
        self.assertEqual(part.preco_venda, 150.5)

    def test_only_current_admin_can_create_and_link_quotes(self):
        payload = dict(nome='Bateria', quantidade=2, quote={'service':'bateria','labor_price':120})
        self.assertEqual(self.client.post('/api/estoque/adicionar',json=payload).status_code, 401)
        self.assertEqual(self.client.post('/api/estoque/adicionar',json=payload,headers=self.headers[2]).status_code, 403)


if __name__ == '__main__':
    unittest.main()
