# Aegis AI Worker Backend

This backend processes queued claims and auto-approves/rejects them using deterministic risk scoring plus optional LLM reasoning.

## Features

- Polls claim queue via Supabase RPC.
- Pulls claim factors from database.
- Calls weather and news APIs for event validation.
- Computes risk score and confidence.
- Optionally calls OpenAI for structured decision reasoning.
- Applies final decision through secure RPC (`apply_ai_claim_decision`).
- Exposes premium recomputation endpoint.

## Setup

1. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Create `backend/.env` with:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.3-mini
GNEWS_API_KEY=

AUTO_APPROVE_MAX_RISK=0.30
AUTO_REJECT_MIN_RISK=0.70
MIN_CONFIDENCE_APPROVE=0.80
MIN_CONFIDENCE_REJECT=0.85
PROCESS_BATCH_SIZE=10
```

3. Run API server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

4. Trigger processing:

```bash
curl -X POST http://localhost:8080/process
```

## Production operation

- Run this service continuously.
- Hit `POST /process` every minute from a scheduler or keep a long-running process loop around it.
- Keep service role key server-side only.
