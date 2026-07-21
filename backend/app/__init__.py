# backend/app/__init__.py
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os
from dotenv import load_dotenv
from datetime import timedelta
from flask_mail import Mail
from sqlalchemy import text

load_dotenv()


# Inicializamos os objetos das extensões
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()  # Instância global


def ensure_db_schema(app):
    with app.app_context():
        try:
            # 1. Garante que o schema 'public' existe (importante para Neon/Postgres resetados)
            with db.engine.connect() as conn:
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS public;"))
                conn.commit()

            # 2. Garante a criação de todas as tabelas definidas nos models
            db.create_all()
            engine = db.engine
        except Exception as e:
            print(f"Erro ao acessar o motor do banco: {e}")
            return

        if engine.dialect.name == "postgresql":
            # Colunas para a tabela 'work_orders'
            wo_columns = {
                "valor_mao_obra": "FLOAT DEFAULT 0.0",
                "custo_operacional": "FLOAT DEFAULT 0.0",
                "desconto_aplicado": "FLOAT DEFAULT 0.0",
                "total_price": "FLOAT",
                "verification_code": "VARCHAR(4)",
                "ready_at": "TIMESTAMP",
                "code_expires_at": "TIMESTAMP",
            }

            # Colunas para a tabela 'users'
            user_columns = {
                "is_verified": "BOOLEAN DEFAULT FALSE",
            }

            with engine.connect() as conn:
                # Atualiza work_orders
                for column_name, column_type in wo_columns.items():
                    exists = conn.execute(
                        text(
                            "SELECT 1 FROM information_schema.columns "
                            "WHERE table_name = 'work_orders' "
                            "AND column_name = :column_name"
                        ),
                        {"column_name": column_name},
                    ).first()

                    if not exists:
                        conn.execute(
                            text(
                                f"ALTER TABLE work_orders ADD COLUMN {column_name} {column_type};"
                            )
                        )
                
                # Atualiza users
                for column_name, column_type in user_columns.items():
                    exists = conn.execute(
                        text(
                            "SELECT 1 FROM information_schema.columns "
                            "WHERE table_name = 'users' "
                            "AND column_name = :column_name"
                        ),
                        {"column_name": column_name},
                    ).first()

                    if not exists:
                        conn.execute(
                            text(
                                f"ALTER TABLE users ADD COLUMN {column_name} {column_type};"
                            )
                        )
                
                conn.commit()


def create_app():
    app = Flask(__name__)

    template_dir = os.path.abspath("../frontend/build")
    static_dir = os.path.abspath("../frontend/build/static")
    app = Flask(__name__, static_folder=static_dir, template_folder=template_dir)
    # Configurações do Banco e JWT
    uri = os.getenv("DATABASE_URL")

    if uri and uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = uri
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,  # Testa a conexão antes de cada query (resolve o SSL closed)
        "pool_recycle": 300,  # Reinicia conexões a cada 5 minutos
        "pool_size": 10,  # Número máximo de conexões mantidas
        "max_overflow": 20,  # Conexões extras permitidas em picos
    }

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "sgat-super-secret-key-32-chars-long-minimum")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=12)

    # Configurações de E-mail (Gmail TLS - Mais compatível com Render)
    app.config["MAIL_SERVER"] = "smtp.gmail.com"
    app.config["MAIL_PORT"] = 587
    app.config["MAIL_USE_TLS"] = True
    app.config["MAIL_USE_SSL"] = False
    app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
    app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
    app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_USERNAME")
    app.config["MAIL_DEBUG"] = True  # Habilita log detalhado no Render

    # Inicialização das Extensões
    # Opção B: Permitir localhost + sua URL do ngrok (Mais seguro)
    CORS(
        app, resources={r"/*": {"origins": "*"}}, supports_credentials=True
    )  # Libera geral para teste com ngrok

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)  # Conecta o mail ao app aqui

    # Importação dos models para o create_all enxergar
    from . import models

    # Registro de Blueprints
    from .routes.auth import auth_bp
    from .routes.os_management import os_bp
    from .routes.inventory import inventory_bp
    from .routes.devices import devices_bp
    from app.routes.vendors import vendors_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(os_bp, url_prefix="/api/os")
    app.register_blueprint(inventory_bp, url_prefix="/api/estoque")
    app.register_blueprint(devices_bp, url_prefix="/api/devices")
    app.register_blueprint(vendors_bp, url_prefix="/api/vendors")

    ensure_db_schema(app)

    # Logo após criar o app = Flask(__name__)

    @app.route("/")
    def health_check():
        return {"status": "Backend Online", "service": "WillSite API"}, 200

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.template_folder, path)):
            return send_from_directory(app.template_folder, path)
        else:
            return send_from_directory(app.template_folder, "index.html")

    return app
