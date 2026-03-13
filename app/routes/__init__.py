from app.routes.auth import auth_bp
from app.routes.worker import worker_bp
from app.routes.admin import admin_bp
from app.routes.api import api_bp

__all__ = ["auth_bp", "worker_bp", "admin_bp", "api_bp"]
