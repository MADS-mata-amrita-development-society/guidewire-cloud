from __future__ import annotations

import json
from datetime import date
from typing import Any

import httpx

from .settings import settings


async def fetch_weather_signal(location_text: str | None, event_date: str | None) -> dict[str, Any]:
    if not location_text:
        return {"provider": "open-meteo", "available": False, "reason": "missing location"}

    async with httpx.AsyncClient(timeout=12) as client:
        geocode = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": location_text, "count": 1, "language": "en", "format": "json"},
        )
        geocode.raise_for_status()
        geo_data = geocode.json()
        if not geo_data.get("results"):
            return {"provider": "open-meteo", "available": False, "reason": "geocode miss"}

        match = geo_data["results"][0]
        lat = match.get("latitude")
        lon = match.get("longitude")
        if lat is None or lon is None:
            return {"provider": "open-meteo", "available": False, "reason": "no lat/lon"}

        target_date = event_date or date.today().isoformat()
        weather = await client.get(
            "https://archive-api.open-meteo.com/v1/archive",
            params={
                "latitude": lat,
                "longitude": lon,
                "start_date": target_date,
                "end_date": target_date,
                "daily": "precipitation_sum,precipitation_hours,rain_sum",
                "timezone": "Asia/Kolkata",
            },
        )
        weather.raise_for_status()
        w_data = weather.json().get("daily", {})

    precipitation = float((w_data.get("precipitation_sum") or [0])[0] or 0)
    rain_sum = float((w_data.get("rain_sum") or [0])[0] or 0)
    rain_hours = float((w_data.get("precipitation_hours") or [0])[0] or 0)

    severe_rain = precipitation >= 50 or rain_sum >= 45 or rain_hours >= 7
    moderate_rain = precipitation >= 20 or rain_sum >= 15 or rain_hours >= 3

    return {
        "provider": "open-meteo",
        "available": True,
        "location": location_text,
        "lat": lat,
        "lon": lon,
        "event_date": target_date,
        "precipitation_sum": precipitation,
        "rain_sum": rain_sum,
        "precipitation_hours": rain_hours,
        "severe_rain": severe_rain,
        "moderate_rain": moderate_rain,
    }


async def fetch_news_signal(location_text: str | None) -> dict[str, Any]:
    if not settings.gnews_api_key:
        return {"provider": "gnews", "available": False, "reason": "missing api key"}

    q = "strike curfew protest"
    if location_text:
        q = f"{q} {location_text}"

    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.get(
            "https://gnews.io/api/v4/search",
            params={
                "q": q,
                "lang": "en",
                "country": "in",
                "max": 5,
                "apikey": settings.gnews_api_key,
            },
        )

    if response.status_code >= 400:
        return {
            "provider": "gnews",
            "available": False,
            "reason": f"http {response.status_code}",
        }

    payload = response.json()
    article_count = int(payload.get("totalArticles") or 0)
    return {
        "provider": "gnews",
        "available": True,
        "location": location_text,
        "article_count": article_count,
        "top_titles": [a.get("title", "") for a in payload.get("articles", [])[:3]],
    }


async def llm_decision(features: dict[str, Any]) -> dict[str, Any] | None:
    if not settings.openai_api_key:
        return None

    instructions = (
        "You are an insurance claim risk reasoner. "
        "Return strict JSON with keys: decision, confidence, rationale, risk_score. "
        "Decision must be one of approve, reject, manual_review."
    )

    payload = {
        "model": settings.openai_model,
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": instructions}]},
            {
                "role": "user",
                "content": [{"type": "input_text", "text": json.dumps(features)}],
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "claim_decision",
                "schema": {
                    "type": "object",
                    "properties": {
                        "decision": {
                            "type": "string",
                            "enum": ["approve", "reject", "manual_review"],
                        },
                        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                        "risk_score": {"type": "number", "minimum": 0, "maximum": 1},
                        "rationale": {"type": "string"},
                    },
                    "required": ["decision", "confidence", "risk_score", "rationale"],
                    "additionalProperties": False,
                },
                "strict": True,
            }
        },
    }

    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post("https://api.openai.com/v1/responses", headers=headers, json=payload)

    if response.status_code >= 400:
        return None

    data = response.json()
    text = data.get("output_text")
    if not text:
        return None

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return None

    return parsed if isinstance(parsed, dict) else None
