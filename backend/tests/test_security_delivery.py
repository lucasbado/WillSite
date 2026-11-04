import os
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from flask_jwt_extended import create_access_token
from flask_migrate import upgrade
from sqlalchemy import inspect, text

from app import create_app, db
from app.models import ConsumedItem, InventoryItem, User, WorkOrder


class SecurityDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite://",
            "JWT_SECRET_KEY": "isolated-test-secret-with-at-least-32-characters",
            "NOTIFICATIONS_ENABLED": False, "MAIL_SUPPRESS_SEND": True,
            "CHAT_AI_ENABLED": False, "GROQ_API_KEY": "",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()
        for identifier, role in [(1, "admin"), (2, "cliente"), (3, "cliente")]:
            user = User(id=identifier, username=f"user{identifier}", role=role,
                        nome_completo=f"Test {identifier}", email=f"test{identifier}@example.test",
                        cpf=str(identifier), is_verified=True)
            user.set_password("test-password")
            db.session.add(user)
        db.session.add(InventoryItem(id=1, nome="Tela", quantidade=2, preco_venda=50, preco_custo=20))
        db.session.add(InventoryItem(id=2, nome="Bateria", quantidade=0, preco_venda=30))
        db.session.add(WorkOrder(id=1, client_id=2, device_model="Modelo A", problem_description="Tela", status="Em Manutenção"))
        db.session.add(WorkOrder(id=2, client_id=3, device_model="Modelo B", problem_description="Bateria", status="Pendente"))
        db.session.commit()
        self.headers = {i: {"Authorization": "Bearer " + create_access_token(identity=str(i), additional_claims={"role": role})}
                        for i, role in [(1, "admin"), (2, "cliente"), (3, "cliente")]}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def ready(self):
        response = self.client.post("/api/os/1/pronto", json={"expira_em": 30}, headers=self.headers[1])
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["os_atualizada"]["code_expires_at"].endswith("Z"))
        return response.json["code"]

    def test_client_cannot_access_admin_endpoints(self):
        routes = [("get", "/api/auth/admin/clientes"), ("get", "/api/os/admin/listar"),
                  ("get", "/api/os/admin/excluidas"), ("get", "/api/os/admin/concluidas"),
                  ("get", "/api/os/admin/calendario"), ("get", "/api/os/admin/escala-mensal"),
                  ("get", "/api/os/admin/financeiro/stats"), ("get", "/api/estoque/"),
                  ("post", "/api/estoque/adicionar"), ("get", "/api/vendors/"),
                  ("post", "/api/devices/adicionar"), ("post", "/api/os/1/pronto"),
                  ("post", "/api/os/1/finalizar"), ("patch", "/api/os/admin/agendar/1")]
        for method, url in routes:
            with self.subTest(url=url):
                response = getattr(self.client, method)(url, json={}, headers=self.headers[2])
                self.assertEqual(response.status_code, 403)

    def test_client_isolation_details_status_receipt_and_cancellation(self):
        for method, url in [("get", "/api/os/detalhes/2"), ("get", "/api/os/2/status"),
                            ("get", "/api/os/detalhes-publico/2"), ("patch", "/api/os/excluir/2")]:
            with self.subTest(url=url):
                self.assertEqual(getattr(self.client, method)(url, headers=self.headers[2]).status_code, 404)
        self.assertFalse(db.session.get(WorkOrder, 2).deletada)
        self.assertEqual(self.client.get("/api/os/detalhes-publico/1").status_code, 401)
        self.assertEqual(self.client.get("/api/os/detalhes-publico/1", headers=self.headers[2]).status_code, 200)
        history = self.client.get("/api/os/meu-historico", headers=self.headers[2]).json
        self.assertEqual([order["id"] for order in history], [1])

    def test_current_database_role_overrules_old_admin_token(self):
        db.session.get(User, 1).role = "cliente"
        db.session.commit()
        self.assertEqual(self.client.get("/api/auth/admin/clientes", headers=self.headers[1]).status_code, 403)

    def test_admin_client_list_counts_client_orders_not_delivery_actor(self):
        self.ready()
        self.client.post("/api/os/1/entregar", json={"is_bypass": True}, headers=self.headers[1])
        response = self.client.get("/api/auth/admin/clientes", headers=self.headers[1])
        self.assertEqual(response.status_code, 200)
        self.assertEqual({row["id"]: row["total_os"] for row in response.json}, {2: 1, 3: 1})

    def test_all_delivery_routes_check_owner_and_expiration(self):
        code = self.ready()
        routes = [("/api/os/validar-qr-entrega", {"os_id": 1, "token": code}),
                  ("/api/os/1/entregar", {"codigo_digitado": code}),
                  (f"/api/os/validar-qr/1/{code}", {})]
        for url, payload in routes:
            with self.subTest(url=url):
                self.assertEqual(self.client.post(url, json=payload, headers=self.headers[3]).status_code, 404)
        order = db.session.get(WorkOrder, 1)
        order.code_expires_at = datetime.utcnow() - timedelta(seconds=1)
        db.session.commit()
        for url, payload in routes:
            with self.subTest(url=url):
                self.assertEqual(self.client.post(url, json=payload, headers=self.headers[2]).status_code, 410)
        self.assertEqual(order.status, "Pronto para Retirada")

    def test_attempt_limit_regeneration_and_single_use(self):
        original = self.ready()
        wrong = "0000" if original != "0000" else "9999"
        for i in range(5):
            response = self.client.post("/api/os/validar-qr-entrega", json={"os_id": 1, "token": wrong}, headers=self.headers[2])
            self.assertEqual(response.status_code, 422 if i < 4 else 429)
        response = self.client.post("/api/os/1/entregar", json={"codigo_digitado": original}, headers=self.headers[2])
        self.assertEqual(response.status_code, 429)
        new_code = self.ready()
        self.assertNotEqual(original, new_code)
        response = self.client.post("/api/os/1/entregar", json={"codigo_digitado": new_code}, headers=self.headers[2])
        self.assertEqual(response.status_code, 200)
        order = db.session.get(WorkOrder, 1)
        self.assertEqual(order.status, "Concluído")
        self.assertIsNone(order.verification_code)
        self.assertIsNone(order.code_expires_at)
        self.assertIsNotNone(order.finished_at)
        self.assertEqual(order.delivered_by_id, 2)
        self.assertEqual(self.client.post("/api/os/1/entregar", json={"codigo_digitado": new_code}, headers=self.headers[2]).status_code, 409)
        self.assertEqual(self.client.post("/api/os/1/pronto", json={}, headers=self.headers[1]).status_code, 409)

    def test_bypass_admin_only_and_audited(self):
        self.ready()
        self.assertEqual(self.client.post("/api/os/1/entregar", json={"is_bypass": True}, headers=self.headers[2]).status_code, 403)
        self.assertEqual(self.client.post("/api/os/1/entregar", json={"is_bypass": "false"}, headers=self.headers[1]).status_code, 400)
        self.assertEqual(self.client.post("/api/os/1/entregar", json={"is_bypass": True}, headers=self.headers[1]).status_code, 200)
        order = db.session.get(WorkOrder, 1)
        self.assertTrue(order.delivery_bypassed)
        self.assertEqual(order.delivered_by_id, 1)

    def test_legacy_qr_route_confirms_and_clears_expiration(self):
        code = self.ready()
        response = self.client.post(f"/api/os/validar-qr/1/{code}", headers=self.headers[2])
        self.assertEqual(response.status_code, 200)
        order = db.session.get(WorkOrder, 1)
        self.assertIsNone(order.code_expires_at)
        self.assertIsNone(order.verification_code)
        self.assertIsNotNone(order.finished_at)

    def test_json_qr_route_confirms_and_missing_code_cannot_match(self):
        code = self.ready()
        self.assertEqual(self.client.post("/api/os/validar-qr-entrega", json={"os_id": 1, "token": None}, headers=self.headers[2]).status_code, 422)
        response = self.client.post("/api/os/validar-qr-entrega", json={"os_id": 1, "token": code}, headers=self.headers[2])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(db.session.get(WorkOrder, 1).status, "Concluído")

    def test_financial_repair_and_delivery_preserve_values_and_stock(self):
        payload = {"itens_ids": [1, 1], "valor_mao_obra": 25.50, "custo_operacional": 4.50, "desconto_aplicado": 10}
        response = self.client.patch("/api/os/admin/concluir-total/1", json=payload, headers=self.headers[1])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["total_calculado"], 120)
        order = db.session.get(WorkOrder, 1)
        self.assertEqual(order.status, "Pronto para Retirada")
        self.assertIsNone(order.finished_at)
        self.assertEqual(db.session.get(InventoryItem, 1).quantidade, 0)
        self.assertEqual(ConsumedItem.query.one().quantidade, 2)
        self.assertEqual(self.client.patch("/api/os/admin/concluir-total/1", json=payload, headers=self.headers[1]).status_code, 409)
        response = self.client.post("/api/os/1/entregar", json={"codigo_digitado": order.verification_code}, headers=self.headers[1])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.total_price, 120)
        self.assertEqual(order.valor_mao_obra, 25.50)
        self.assertEqual(db.session.get(InventoryItem, 1).quantidade, 0)

    def test_invalid_finance_and_insufficient_stock_make_no_partial_changes(self):
        for payload in [{"itens_ids": [1, 2]}, {"itens_ids": [1, 1, 1]}, {"itens_ids": [99]},
                        {"itens_ids": ["1"]}, {"valor_mao_obra": "NaN"}, {"valor_mao_obra": -1},
                        {"desconto_aplicado": 100}, {"valor_mao_obra": "invalid"}]:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.patch("/api/os/admin/concluir-total/1", json=payload, headers=self.headers[1]).status_code, 400)
                self.assertEqual(db.session.get(InventoryItem, 1).quantidade, 2)
                self.assertEqual(ConsumedItem.query.count(), 0)
                self.assertEqual(db.session.get(WorkOrder, 1).status, "Em Manutenção")

    def test_rescheduling_pickup_cannot_reopen_billing(self):
        payload = {"itens_ids": [1], "valor_mao_obra": 20}
        self.assertEqual(self.client.patch("/api/os/admin/concluir-total/1", json=payload, headers=self.headers[1]).status_code, 200)
        code = db.session.get(WorkOrder, 1).verification_code
        schedule = {"data_entrega": "2026-11-05T14:00"}
        response = self.client.patch("/api/os/admin/agendar/1", json=schedule, headers=self.headers[1])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(db.session.get(WorkOrder, 1).status, "Pronto para Retirada")
        self.assertEqual(db.session.get(WorkOrder, 1).verification_code, code)
        self.assertEqual(self.client.patch("/api/os/admin/concluir-total/1", json=payload, headers=self.headers[1]).status_code, 409)
        self.assertEqual(db.session.get(InventoryItem, 1).quantidade, 1)
        self.client.post("/api/os/1/entregar", json={"codigo_digitado": code}, headers=self.headers[1])
        self.assertEqual(self.client.patch("/api/os/admin/agendar/1", json=schedule, headers=self.headers[1]).status_code, 409)

    def test_financial_metrics_use_delivered_orders_and_recorded_costs(self):
        response = self.client.patch("/api/os/admin/concluir-total/1", json={"itens_ids": [1], "valor_mao_obra": 25,
            "custo_operacional": 5, "desconto_aplicado": 10}, headers=self.headers[1])
        self.assertEqual(response.status_code, 200)
        self.client.post("/api/os/1/entregar", json={"is_bypass": True}, headers=self.headers[1])
        order = db.session.get(WorkOrder, 2)
        order.status = "Entregue"
        order.total_price = 30
        order.custo_operacional = 2
        order.finished_at = datetime.utcnow()
        db.session.add(WorkOrder(id=3, client_id=2, device_model="Pendente", problem_description="Teste", status="Pendente", total_price=999))
        db.session.add(WorkOrder(id=4, client_id=2, device_model="Excluída", problem_description="Teste", status="Concluído", total_price=999, deletada=True))
        from app.models import InventoryLoss
        db.session.add(InventoryLoss(item_id=1, quantidade=1, valor_perda=20, motivo="Quebra"))
        db.session.commit()
        response = self.client.get("/api/os/admin/financeiro/stats", headers=self.headers[1])
        self.assertEqual(response.status_code, 200)
        stats = response.json
        self.assertEqual(stats["receitaTotal"], 100)
        self.assertEqual(stats["volumeConsertos"], 2)
        self.assertEqual(stats["ticketMedio"], 50)
        self.assertEqual(stats["maiorMargemServico"], 45)
        self.assertEqual(stats["lucroReal"], 73)
        self.assertEqual(stats["skusAtivos"], 1)
        self.assertEqual(stats["markupEstoque"], 150)
        self.assertEqual(stats["perdasPorMotivo"], [{"motivo": "Quebra", "quantidade": 1, "valorTotal": 20}])
        self.assertEqual(sum(m["receita"] for m in stats["tendenciaMensal"]), 100)
        self.assertEqual(len({m["mes"] for m in stats["tendenciaMensal"]}), 6)

    def test_financial_metrics_without_deliveries_have_no_sample_values(self):
        stats = self.client.get("/api/os/admin/financeiro/stats", headers=self.headers[1]).json
        self.assertEqual(stats["ticketMedio"], 0)
        self.assertIsNone(stats["maiorMargemServico"])
        self.assertEqual(stats["volumeConsertos"], 0)
        self.assertEqual(stats["perdasPorMotivo"], [])

    def test_order_lists_include_phone_deadline_and_delivery_date(self):
        db.session.get(User, 2).telefone = "(11) 99999-1234"
        order = db.session.get(WorkOrder, 1)
        order.scheduled_date = datetime(2026, 11, 5, 14, 30)
        db.session.commit()
        orders = self.client.get("/api/os/admin/listar", headers=self.headers[1]).json
        row = next(item for item in orders if item["id"] == 1)
        self.assertEqual(row["telefone"], "(11) 99999-1234")
        self.assertEqual(row["scheduled_for"], "2026-11-05T14:30:00-03:00")
        history = self.client.get("/api/os/meu-historico", headers=self.headers[2]).json
        self.assertEqual(history[0]["scheduled_for"], row["scheduled_for"])
        self.assertIsNone(history[0]["data_finalizacao"])

    def test_delivery_fields_cannot_trigger_financial_completion(self):
        self.assertEqual(self.client.post("/api/os/1/finalizar", json={"codigo_digitado": "1234"}, headers=self.headers[1]).status_code, 400)

    def test_malformed_payloads_and_deleted_order(self):
        for payload in [[], None, {"os_id": True}, {"os_id": "1"}]:
            self.assertEqual(self.client.post("/api/os/validar-qr-entrega", json=payload, headers=self.headers[2]).status_code, 400)
        for minutes in [0, 121, "30", True]:
            self.assertEqual(self.client.post("/api/os/1/pronto", json={"expira_em": minutes}, headers=self.headers[1]).status_code, 400)
        self.ready()
        order = db.session.get(WorkOrder, 1)
        order.deletada = True
        db.session.commit()
        self.assertEqual(self.client.post("/api/os/validar-qr-entrega", json={"os_id": 1, "token": order.verification_code}, headers=self.headers[2]).status_code, 404)

    def test_health_is_public_no_store_and_does_not_use_database(self):
        with patch.object(db.session, "execute", side_effect=AssertionError("Não deve consultar banco")):
            response = self.client.get("/healthz")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertEqual(self.client.get("/api/readyz").status_code, 200)
        self.assertEqual(self.client.get("/api/unknown").status_code, 404)


class ConfigurationMigrationTests(unittest.TestCase):
    def test_development_ignores_production_database_url(self):
        with patch.dict(os.environ, {"APP_ENV": "development", "DATABASE_URL": "postgresql://do-not-connect/production"}):
            app = create_app()
            self.assertTrue(app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:"))
            self.assertFalse(app.config["NOTIFICATIONS_ENABLED"])

    def test_startup_does_not_create_or_migrate_tables(self):
        app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite://"})
        with app.app_context():
            self.assertEqual(inspect(db.engine).get_table_names(), [])
            db.engine.dispose()

    def test_production_requires_private_jwt_secret(self):
        with patch.dict(os.environ, {"APP_ENV": "production", "DATABASE_URL": "postgresql://unused/test", "JWT_SECRET_KEY": ""}):
            with self.assertRaisesRegex(RuntimeError, "JWT_SECRET_KEY"):
                create_app()

    def test_production_requires_database(self):
        with patch.dict(os.environ, {"APP_ENV": "production", "DATABASE_URL": "", "JWT_SECRET_KEY": "test-secret"}):
            with self.assertRaisesRegex(RuntimeError, "DATABASE_URL"):
                create_app()

    def test_migration_preserves_legacy_data(self):
        with tempfile.TemporaryDirectory() as directory:
            uri = "sqlite:///" + (Path(directory) / "migration.db").as_posix()
            app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": uri})
            with app.app_context():
                upgrade(revision="0001")
                db.session.execute(text("INSERT INTO users (id, username, password_hash, nome_completo, email, cpf) VALUES (1, 'legacy', 'hash', 'Legacy', 'legacy@example.test', '1')"))
                db.session.execute(text("INSERT INTO work_orders (id, client_id, device_model, problem_description, status, total_price) VALUES (1, 1, 'Legacy', 'Tela', 'Pronto para Retirada', 150)"))
                db.session.commit()
                upgrade()
                order = db.session.get(WorkOrder, 1)
                self.assertEqual(order.total_price, 150)
                self.assertEqual(order.verification_attempts, 0)
                self.assertFalse(order.delivery_bypassed)
                db.session.remove()
                db.engine.dispose()


if __name__ == "__main__":
    unittest.main()
