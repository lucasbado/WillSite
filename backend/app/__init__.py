from datetime import timedelta
from pathlib import Path
import os
import secrets

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()


def create_app(test_config=None):
    backend_dir = Path(__file__).resolve().parents[1]
    build_dir = backend_dir.parent / "frontend" / "build"
    # O .env antigo pode apontar para produção. Desenvolvimento só lê .env.local.
    environment = os.getenv("APP_ENV", "production" if os.getenv("RENDER") else "development")
    load_dotenv(backend_dir / (".env" if environment == "production" else ".env.local"))
    production = environment == "production"
    app = Flask(__name__, static_folder=str(build_dir / "static"))
    local_uri = "sqlite:///willsite-local.db"
    uri = os.getenv("DATABASE_URL") if production else os.getenv("LOCAL_DATABASE_URL", local_uri)
    if uri and uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql://", 1)

    app.config.from_mapping(
        APP_ENV=environment,
        SQLALCHEMY_DATABASE_URI=uri,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY") if production else os.getenv("LOCAL_JWT_SECRET_KEY", secrets.token_hex(32)),
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=12),
        FRONTEND_URL=os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/"),
        MAIL_SERVER="smtp.gmail.com",
        MAIL_PORT=587,
        MAIL_USE_TLS=True,
        MAIL_USE_SSL=False,
        MAIL_USERNAME=os.getenv("MAIL_USERNAME") if production else None,
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD") if production else None,
        MAIL_DEFAULT_SENDER=os.getenv("MAIL_USERNAME", "local@willsite.test"),
        MAIL_SUPPRESS_SEND=not production,
        NOTIFICATIONS_ENABLED=production,
        CHAT_AI_ENABLED=os.getenv('CHAT_AI_ENABLED', 'false').lower() == 'true',
        GROQ_API_KEY=os.getenv('GROQ_API_KEY', ''),
        GROQ_MODELS=list(dict.fromkeys(model.strip() for model in os.getenv(
            'GROQ_MODELS', 'openai/gpt-oss-20b,openai/gpt-oss-120b').split(',') if model.strip()))[:3],
        CHAT_AI_DAILY_LIMIT=int(os.getenv('CHAT_AI_DAILY_LIMIT', '100')),
        CHAT_AI_MINUTE_LIMIT=int(os.getenv('CHAT_AI_MINUTE_LIMIT', '12')),
    )
    if test_config:
        app.config.update(test_config)
    if not app.config["SQLALCHEMY_DATABASE_URI"]:
        raise RuntimeError("DATABASE_URL é obrigatória em produção.")
    if not app.config["JWT_SECRET_KEY"]:
        raise RuntimeError("JWT_SECRET_KEY é obrigatória em produção.")
    engine_options = {"pool_pre_ping": True, "pool_recycle": 300}
    if app.config["SQLALCHEMY_DATABASE_URI"].startswith("postgresql"):
        engine_options.update(pool_size=5, max_overflow=5, pool_timeout=30, connect_args={"connect_timeout": 10})
    app.config.setdefault("SQLALCHEMY_ENGINE_OPTIONS", engine_options)

    origins = os.getenv("CORS_ORIGINS", app.config["FRONTEND_URL"]).split(",")
    CORS(app, resources={r"/api/*": {"origins": [origin.strip() for origin in origins]}})
    db.init_app(app)
    migrate.init_app(app, db, directory=str(backend_dir / "migrations"))
    jwt.init_app(app)
    mail.init_app(app)

    from . import models
    from .routes.auth import auth_bp
    from .routes.os_management import os_bp
    from .routes.inventory import inventory_bp
    from .routes.devices import devices_bp
    from .routes.vendors import vendors_bp
    from .security import enforce_access
    from .routes.assistant import assistant_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(os_bp, url_prefix="/api/os")
    app.register_blueprint(inventory_bp, url_prefix="/api/estoque")
    app.register_blueprint(devices_bp, url_prefix="/api/devices")
    app.register_blueprint(vendors_bp, url_prefix="/api/vendors")
    app.register_blueprint(assistant_bp, url_prefix='/api/assistant')
    app.before_request(enforce_access)

    @app.get("/healthz")
    @app.get("/api/healthz")
    def health_check():
        return jsonify(status="ok", service="WillSite API")

    @app.get("/api/readyz")
    def readiness_check():
        try:
            db.session.execute(text("SELECT 1"))
            return jsonify(status="ok")
        except Exception:
            db.session.rollback()
            app.logger.exception("Banco indisponível")
            return jsonify(status="unavailable"), 503

    @app.after_request
    def prevent_private_caching(response):
        if request.path.startswith("/api/") or request.path == "/healthz":
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def serve(path):
        if path.startswith("api/"):
            return jsonify(msg="Rota não encontrada"), 404
        if build_dir.is_dir():
            if path and (build_dir / path).is_file():
                return send_from_directory(build_dir, path)
            return send_from_directory(build_dir, "index.html")
        return jsonify(status="Backend Online", service="WillSite API"), 200 if not path else 404

    return app
