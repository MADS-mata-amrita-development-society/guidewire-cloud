import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///guidewire.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    WTF_CSRF_ENABLED = True

    # Scheduler
    SCHEDULER_API_ENABLED = True
    DISRUPTION_CHECK_INTERVAL_MINUTES = 30

    # Mock payout limits
    MAX_WEEKLY_PAYOUT = 5000.00
    BASE_WEEKLY_COVERAGE = 500.00

    # Weather/Traffic API keys (mock values — replace with real keys)
    OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "mock_weather_key")
    TOMTOM_API_KEY = os.environ.get("TOMTOM_API_KEY", "mock_traffic_key")

    # Premium calculation weights
    PREMIUM_BASE_RATE = 0.05        # 5% of coverage amount
    RISK_WEATHER_WEIGHT = 0.35
    RISK_LOCATION_WEIGHT = 0.30
    RISK_HISTORY_WEIGHT = 0.20
    RISK_VEHICLE_WEIGHT = 0.15


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    SECRET_KEY = "test-secret-key"
