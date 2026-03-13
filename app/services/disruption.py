"""Disruption detection service.

Checks weather and traffic APIs (or mocks when keys are absent) and creates
DisruptionEvent records for any city that has active workers with policies.
"""
from __future__ import annotations

import logging
import random
from datetime import datetime, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)

# Thresholds for weather conditions
_HEAVY_RAIN_MM_PER_HOUR = 15.0    # mm/h
_EXTREME_HEAT_CELSIUS = 42.0
_FLOODING_RAIN_MM_PER_HOUR = 50.0
_HIGH_WIND_KMH = 80.0

# Mock disruption data keyed by city (lower-case) for demo/testing
MOCK_DISRUPTIONS: dict[str, list[dict[str, Any]]] = {
    "mumbai": [
        {"type": "heavy_rain", "severity": "high", "description": "Heavy monsoon rainfall detected (22 mm/h)"},
        {"type": "flooding", "severity": "critical", "description": "Coastal flooding reported in low-lying areas"},
    ],
    "delhi": [
        {"type": "extreme_heat", "severity": "high", "description": "Temperature reached 45 °C — extreme heat advisory"},
        {"type": "curfew", "severity": "moderate", "description": "Local curfew imposed due to civil unrest"},
    ],
    "chennai": [
        {"type": "heavy_rain", "severity": "moderate", "description": "Northeast monsoon rain (18 mm/h)"},
    ],
    "kolkata": [
        {"type": "traffic_jam", "severity": "high", "description": "Major road blockage — delivery routes impassable"},
    ],
    "bangalore": [
        {"type": "heavy_rain", "severity": "moderate", "description": "Unseasonally heavy rain (16 mm/h)"},
    ],
}


def _parse_weather_response(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract disruption signals from an OpenWeatherMap current-weather payload."""
    events: list[dict[str, Any]] = []
    try:
        rain_1h = data.get("rain", {}).get("1h", 0.0)
        temp = data.get("main", {}).get("temp", 20.0)
        wind_speed = data.get("wind", {}).get("speed", 0.0) * 3.6  # m/s → km/h
        weather_id = data.get("weather", [{}])[0].get("id", 800)

        if rain_1h >= _FLOODING_RAIN_MM_PER_HOUR:
            events.append({"type": "flooding", "severity": "critical",
                           "description": f"Flooding risk: {rain_1h:.1f} mm/h rainfall"})
        elif rain_1h >= _HEAVY_RAIN_MM_PER_HOUR:
            events.append({"type": "heavy_rain", "severity": "high",
                           "description": f"Heavy rain: {rain_1h:.1f} mm/h"})

        if temp >= _EXTREME_HEAT_CELSIUS:
            events.append({"type": "extreme_heat", "severity": "high",
                           "description": f"Extreme heat: {temp:.1f} °C"})

        if wind_speed >= _HIGH_WIND_KMH:
            events.append({"type": "high_wind", "severity": "moderate",
                           "description": f"High winds: {wind_speed:.1f} km/h"})

        # Thunderstorm group (2xx) or tornado (781)
        if 200 <= weather_id < 300 or weather_id == 781:
            events.append({"type": "storm", "severity": "high",
                           "description": "Severe storm or thunderstorm detected"})
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not parse weather response: %s", exc)
    return events


def fetch_weather_disruptions(city: str, api_key: str) -> list[dict[str, Any]]:
    """Query OpenWeatherMap for the given city.  Falls back to mock data."""
    if not api_key or api_key.startswith("mock_"):
        return _mock_disruptions(city)

    url = "https://api.openweathermap.org/data/2.5/weather"
    try:
        resp = requests.get(
            url,
            params={"q": city, "appid": api_key, "units": "metric"},
            timeout=10,
        )
        resp.raise_for_status()
        return _parse_weather_response(resp.json())
    except requests.RequestException as exc:
        logger.warning("Weather API error for %s: %s — using mock data", city, exc)
        return _mock_disruptions(city)


def fetch_traffic_disruptions(city: str, api_key: str) -> list[dict[str, Any]]:
    """Query TomTom traffic incidents for the given city.  Falls back to mock."""
    if not api_key or api_key.startswith("mock_"):
        return _mock_traffic(city)

    # TomTom Traffic Incidents API (simplified bounding box)
    url = "https://api.tomtom.com/traffic/services/5/incidentDetails"
    try:
        resp = requests.get(
            url,
            params={"key": api_key, "bbox": _city_bbox(city), "fields": "{incidents{type,properties{iconCategory}}}"},
            timeout=10,
        )
        resp.raise_for_status()
        incidents = resp.json().get("incidents", [])
        if any(i.get("properties", {}).get("iconCategory", 0) >= 6 for i in incidents):
            return [{"type": "traffic_jam", "severity": "high",
                     "description": f"Major traffic incident in {city}"}]
    except requests.RequestException as exc:
        logger.warning("Traffic API error for %s: %s — using mock data", city, exc)
        return _mock_traffic(city)
    return []


def _city_bbox(city: str) -> str:
    """Return a rough bounding box string for common Indian cities."""
    bboxes = {
        "mumbai": "72.7,18.8,73.1,19.3",
        "delhi": "76.8,28.4,77.4,28.9",
        "chennai": "80.1,12.9,80.3,13.2",
        "kolkata": "88.2,22.4,88.5,22.7",
        "bangalore": "77.4,12.8,77.7,13.1",
    }
    return bboxes.get(city.lower(), "77.0,20.0,78.0,21.0")


def _mock_disruptions(city: str) -> list[dict[str, Any]]:
    """Return deterministic mock disruptions for known cities."""
    return MOCK_DISRUPTIONS.get(city.lower(), [])


def _mock_traffic(city: str) -> list[dict[str, Any]]:
    """Return a mock traffic jam for Kolkata only."""
    if city.lower() == "kolkata":
        return [{"type": "traffic_jam", "severity": "high",
                 "description": "Major road blockage — delivery routes impassable"}]
    return []


def detect_and_store_disruptions(app: Any) -> list[int]:
    """Detect disruptions for all cities with active policies and persist them.

    Returns a list of newly created DisruptionEvent IDs.
    """
    from app.models import DisruptionEvent, Policy, WorkerProfile, db

    with app.app_context():
        new_ids: list[int] = []
        weather_key = app.config.get("OPENWEATHER_API_KEY", "")
        traffic_key = app.config.get("TOMTOM_API_KEY", "")

        # Collect unique cities from active policies
        active_cities: set[str] = set()
        active_policies = Policy.query.filter_by(status="active").all()
        for policy in active_policies:
            profile = WorkerProfile.query.filter_by(user_id=policy.worker_id).first()
            if profile and profile.city:
                active_cities.add(profile.city)

        for city in active_cities:
            raw_events = fetch_weather_disruptions(city, weather_key)
            raw_events += fetch_traffic_disruptions(city, traffic_key)

            for event in raw_events:
                # Avoid duplicate active events of the same type in the same city
                existing = DisruptionEvent.query.filter_by(
                    city=city, disruption_type=event["type"], is_active=True
                ).first()
                if existing:
                    continue

                disruption = DisruptionEvent(
                    city=city,
                    disruption_type=event["type"],
                    severity=event.get("severity", "moderate"),
                    description=event.get("description", ""),
                    detected_at=datetime.now(timezone.utc),
                    source="weather_api" if "rain" in event["type"] or "heat" in event["type"] else "traffic_api",
                )
                db.session.add(disruption)
                db.session.flush()
                new_ids.append(disruption.id)
                logger.info("New disruption detected: %s in %s", event["type"], city)

        db.session.commit()
        return new_ids
