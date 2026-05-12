import os
import sys
from sqlalchemy import create_engine
from app import create_app, db
from app.models import User, InventoryItem, WorkOrder, ConsumedItem
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

# Força o encoding no ambiente
os.environ['PGCLIENTENCODING'] = 'UTF8'

def run_seed():
    app = create_app()
    
    with app.app_context():
        print("--- Iniciando Setup do Banco ---")
        try:
            # 1. Criar as tabelas
            # O db.create_all() usa a URI do seu .env
            db.create_all()
            print("✅ Tabelas criadas (ou já existentes).")

            # 2. Popular Admin
            if not User.query.filter_by(email="admin@sgat.com").first():
                admin = User(
                    username="admin",
                    nome_completo="Lucas Admin",
                    email="admin@sgat.com",
                    cpf=('00'),
                    cep=('00'),
                    endereco=('00'),
                    password_hash=generate_password_hash("admin123"),
                    role="admin"
                )
                db.session.add(admin)
                print("✅ Admin criado: admin@sgat.com / admin123")
            
            # 3. Itens de Estoque
            if not InventoryItem.query.first():
                tela = InventoryItem(nome="Tela iPhone 13", descricao="Original", quantidade=10, minimo=2)
                bateria = InventoryItem(nome="Bateria S23", descricao="4500mAh", quantidade=5, minimo=1)
                db.session.add_all([tela, bateria])
                print("✅ Estoque inicial adicionado.")

            db.session.commit()
            print("--- Setup Finalizado com Sucesso! ---")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Erro crítico: {e}")
            print("\n💡 DICA: Se o erro for 'UnicodeDecodeError', tente rodar:")
            print("SET PGCLIENTENCODING=utf-8")
            print("antes de executar este script.")

if __name__ == "__main__":
    run_seed()