# AI smoke test (manual)

Use this to verify chat, insights, and RAG **after** `npm run dev` and a valid `.env`.

## 1. Config check (no Gemini calls)

```bash
curl -s http://localhost:3000/api/ai-health | jq .
```

- **`ok: true`** — `GEMINI_API_KEY` (or Anthropic, if configured) is set.
- **`ok: false`** or **503** — fix `.env` before testing chat.

## 2. Insights (one Gemini call)

Open the dashboard; the **AI narrative** block should load or show a deterministic fallback if the API fails.

Or:

```bash
curl -s -X POST http://localhost:3000/api/insights \
  -H "Content-Type: application/json" \
  -d '{"from":"2025-06-01","to":"2025-12-31","branchId":null}' | jq '.summary, .bullets | length'
```

- **Working:** JSON with `summary`, `bullets` (array), `suggestedQueries`.
- **Not working:** `error` field, or quota/rate-limit messages in server logs.

## 3. Chat prompts (try in the DealerPulse AI UI)

Copy-paste one at a time:

1. **“List the five branch names and their cities.”**  
   - **Pass:** Names match `doc/dealership_data.json` branches (e.g. Downtown Toyota, Chennai).  
   - **Fail:** Empty reply, “quota” / “429”, or clearly wrong cities.

2. **“How many sales reps are in the dataset?”**  
   - **Pass:** Answer is **30** (or consistent with your JSON).  
   - **Fail:** “I don’t have access” for every question (RAG + context empty and model not using data).

3. **“Which branch is Downtown Toyota and what is its branch id?”**  
   - **Pass:** Mentions **B1** (or correct id from data).  
   - **Fail:** Hallucinated id.

## 4. When something is “not working”

| Symptom | Likely cause |
|--------|----------------|
| `429` / `quota` / `limit: 0` in terminal | **Gemini free tier exhausted** — billing, wait, or new project key. |
| Chat works but answers are generic | **RAG didn’t load** (embeddings failed); chat still runs without retrieved chunks. |
| `ai-health` `ok: false` | Missing **`GEMINI_API_KEY`**. |
| Pinecone errors | Index missing or **wrong dimension**; app falls back to **in-memory** RAG if configured. |

## 5. Automated tests (local, no API keys)

```bash
npm test
```

Runs unit tests for analytics, RAG chunking, sanitization, quota helpers, and config snapshot — **not** live Gemini calls.
