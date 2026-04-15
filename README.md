# Bilgi Grafiği Üretimi

MEF Üniversitesi Bilgisayar Mühendisliği Bitirme Projesi — Extracts structured knowledge graph triples from free-form text using multiple KG extraction techniques and prompt optimization strategies, then visualises the result as an interactive graph.

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [Using the UI](#using-the-ui)
- [KG Extraction Methods](#kg-extraction-methods)
- [Prompt Optimization Types](#prompt-optimization-types)
- [Backend API Reference](#backend-api-reference)
- [Wikontic Service Integration](#wikontic-service-integration)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  React + Vite  (http://localhost:5173)                      │
│                                                             │
│  ┌──────────┐   POST /api/extract    ┌──────────────────┐   │
│  │  PlusGraph│ ─────────────────────▶│                  │   │
│  │  (canvas) │                       │  FastAPI Backend  │   │
│  └──────────┘   GET  /api/models     │  (port 8000)     │   │
│  ┌──────────┐ ◀───────────────────── │                  │   │
│  │ResultCard│   POST /api/visualize  │                  │   │
│  └──────────┘                        └────────┬─────────┘   │
└─────────────────────────────────────────────────────────────┘
                                                │
                   ┌────────────────────────────┤
                   │                            │
          Wikipedia / LLM path        Wikontic path
          (OpenRouter API)            (when kg_type = wicontic)
                   │                            │
          ┌────────▼────────┐        ┌──────────▼──────────┐
          │  OpenRouter API │        │  Wikontic Service    │
          │  (cloud)        │        │  (http://localhost:  │
          └─────────────────┘        │   8001 by default)   │
                                     └─────────────────────┘
```

**Components:**

| Component | Tech | Port | Purpose |
|---|---|---|---|
| Frontend | React 19 + Vite 6 | 5173 | Interactive UI |
| Backend | FastAPI + Uvicorn | 8000 | API gateway, LLM calls, visualisation |
| Wikontic Service | External FastAPI | 8001 | Embedding-based KG extraction |

---

## Prerequisites

| Tool | Minimum Version |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |

An **OpenRouter API key** is required for the Wikipedia/LLM extraction path.  
A running **Wikontic service** is required for the Wikontic extraction path.

---

## Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd Bilgi-Grafi-i-Product-Phase
```

### 2. Backend — create virtualenv and install dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install fastapi uvicorn httpx "httpx>=0.24.0" \
            requests beautifulsoup4 pyvis python-dotenv
```

### 3. Frontend — install npm packages

```bash
cd ../frontend
npm install
```

---

## Configuration

Create `backend/.env` (copy the template below):

```env
# OpenRouter API key — required for Wikipedia/LLM extraction
OPENROUTER_API_KEY=your_openrouter_api_key_here

# OpenRouter base URL
LLM_BASE_ADDRESS=https://openrouter.ai/api/v1

# Wikontic service base URL — change port if you run it elsewhere
WIKONTIC_URL=http://localhost:8001
```

### Available LLM models

The list of models shown in the dropdown is controlled by `backend/allowedOpenroutherLLMModels.json`:

```json
[
  { "id": "google/gemini-2.5-flash-lite", "label": "google/gemini-2.5-flash-lite" }
]
```

Add or remove entries to expose more OpenRouter models.

---

## Running the Project

### Option A — single script (recommended)

```bash
# From the project root
bash start.sh
```

This starts both services and prints their URLs:

```
Backend  : http://localhost:8000
Frontend : http://localhost:5173
```

Press `Ctrl+C` to stop both.

### Option B — manually

**Terminal 1 — backend**

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend**

```bash
cd frontend
npm run dev
```

### Option C — with Wikontic service

If you intend to use the Wikontic KG extraction method, also start the Wikontic service in a third terminal. It must **not** use port 8000 (already taken by the backend):

```bash
# Inside the Wikontic project directory
uvicorn api:app --host 0.0.0.0 --port 8001
```

Verify it is running:

```bash
curl http://localhost:8001/
# → {"status": "ok", "service": "Wikontic Extraction API"}
```

If you use a different port, update `WIKONTIC_URL` in `backend/.env` accordingly.

---

## Using the UI

Open **http://localhost:5173** in a browser.

### Step 1 — Enter text

1. Select an **LLM model** from the dropdown (top-left of the input box).
2. Type or paste a paragraph (max 300 characters) into the textarea.
3. Click the **send arrow** (↗) to proceed.

### Step 2 — Build a graph card

After submitting, an interactive force-graph node selector appears (the **PlusGraph**). It has two branches:

| Branch | Options |
|---|---|
| KG Çıkarım Tekniği | Wikipedia · Wicontic · KG-GEN |
| Prompt Optimizasyon Tekniği | Temel Prompt · DSPy · TextGrad |

1. **Click a KG method node** — a checkmark appears on it.
2. **Click a Prompt method node** — a checkmark appears on it.
3. If you selected **Wicontic**, a third branch — **Gömme Modeli** — appears automatically with four embedding options:
   - `Contriever`
   - `BGE-M3`
   - `Turkish E5`
   - `MFT Random`
   
   Click one of them to select it.
4. Once all required choices are made, the center node pulses blue and shows **"tıklayarak grafı oluştur"**. Click it to generate the graph card.

Up to **3 graph cards** can exist side-by-side. Each card shows:

- The selected LLM model name
- The input text (truncated)
- Chips for KG method / prompt method / embedding model (when applicable)
- Triple / entity / relation counts
- An interactive force-directed knowledge graph (powered by vis-network)
- An expand button (⤢) for a full-screen modal view

Cards can be individually deleted with the × button.

---

## KG Extraction Methods

### Wikipedia (default)

Uses an LLM via OpenRouter with a Turkish-language knowledge graph system prompt. The prompt instructs the model to extract `(subject, relation, object)` triples and return them as a JSON array.

**System prompt location:** `backend/wikipedia/systemPrompt.jsonl`

**Triple format returned by LLM:**

```json
[
  {
    "baş":      "Albert Einstein",
    "baş_tipi": "Kişi",
    "ilişki":   "DoğduğuYer",
    "uç":       "Almanya",
    "uç_tipi":  "Ülke"
  }
]
```

### Wicontic

Delegates extraction to the Wikontic service, which combines an embedding model (for entity/ontology lookup) with an LLM (for relation generation). See [Wikontic Service Integration](#wikontic-service-integration) below.

### KG-GEN

Placeholder — wired in the UI but not yet implemented in the backend.

---

## Prompt Optimization Types

Sent to the backend as `prompt_type`. Only relevant for the **Wikipedia** path (Wikontic uses its own internal prompt):

| Value | Technique |
|---|---|
| `temel` | Baseline prompt (default) |
| `dspy` | DSPy-optimised prompt |
| `textgrad` | TextGrad-optimised prompt |

---

## Backend API Reference

Base URL: `http://localhost:8000`

---

### `GET /api/models`

Returns the list of selectable LLM models.

**Response**

```json
[
  { "id": "google/gemini-2.5-flash-lite", "label": "google/gemini-2.5-flash-lite" }
]
```

---

### `POST /api/extract`

Extracts knowledge graph triples from the given text.

**Request body**

```json
{
  "text":            "Paragraph to extract from.",
  "model":           "google/gemini-2.5-flash-lite",
  "prompt_type":     "temel",
  "kg_type":         "wikipedia",
  "embedding_model": "contriever"
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `text` | string | required | Input paragraph |
| `model` | string | required | LLM model ID (OpenRouter or compatible) |
| `prompt_type` | string | `"temel"` | `temel` · `dspy` · `textgrad` |
| `kg_type` | string | `"wikipedia"` | `wikipedia` · `wicontic` · `kggen` |
| `embedding_model` | string | `"contriever"` | Used only when `kg_type = "wicontic"` |

**Response**

```json
{
  "triplets": [
    {
      "baş":      "Albert Einstein",
      "baş_tipi": "Kişi",
      "ilişki":   "DoğduğuYer",
      "uç":       "Almanya",
      "uç_tipi":  "Ülke"
    }
  ],
  "highlight": ["Albert Einstein"]
}
```

`highlight` contains the unique subject entities, used to colour nodes green in the graph.

---

### `POST /api/visualize`

Generates a self-contained vis-network HTML string from a triplet list.

**Request body**

```json
{
  "triplets": [
    {
      "baş":      "Albert Einstein",
      "baş_tipi": "Kişi",
      "ilişki":   "DoğduğuYer",
      "uç":       "Almanya",
      "uç_tipi":  "Ülke"
    }
  ],
  "highlight": ["Albert Einstein"]
}
```

**Response** — `text/html` (full HTML document, embeddable in an `<iframe>`)

---

## Wikontic Service Integration

### Overview

When `kg_type = "wicontic"` the backend does **not** call OpenRouter. Instead it forwards the request to the Wikontic microservice, which uses an embedding model to ground entities in a knowledge base and an LLM to generate relations.

### Starting the Wikontic service

```bash
# Inside the Wikontic project directory
uvicorn api:app --host 0.0.0.0 --port 8001
```

Check health:

```bash
curl http://localhost:8001/
# {"status": "ok", "service": "Wikontic Extraction API"}
```

### Wikontic extraction endpoint

```
POST http://localhost:8001/extract
```

**Request**

```json
{
  "text":            "Albert Einstein was born in Germany.",
  "embedding_model": "contriever",
  "llm_model":       "google/gemini-2.5-flash-lite"
}
```

| Field | Options | Description |
|---|---|---|
| `text` | any string | Paragraph to extract from |
| `embedding_model` | `contriever` · `bge_m3` · `turkish_e5_large` · `mft_random` | Embedding model for entity/ontology lookup |
| `llm_model` | any OpenAI-compatible model name | LLM used to generate relations |

**Embedding model guide**

| Model | Best for |
|---|---|
| `contriever` | General-purpose, strong cross-lingual recall |
| `bge_m3` | High-quality multilingual embeddings |
| `turkish_e5_large` | Turkish-language text specifically |
| `mft_random` | Fast baseline / ablation testing |

**Response from Wikontic**

```json
{
  "triplets": [
    {
      "subject":      "Albert Einstein",
      "subject_type": "Person",
      "relation":     "bornIn",
      "object":       "Germany",
      "object_type":  "Country"
    }
  ],
  "count": 1
}
```

### Field mapping (Wikontic → app)

The backend translates Wikontic's English field names to the app's Turkish schema before returning to the frontend:

| Wikontic field | App field |
|---|---|
| `subject` | `baş` |
| `subject_type` | `baş_tipi` |
| `relation` | `ilişki` |
| `object` | `uç` |
| `object_type` | `uç_tipi` |

### End-to-end Wikontic flow

```
Browser
  │
  │  POST /api/extract
  │  { kg_type: "wicontic", embedding_model: "bge_m3", model: "gpt-4o-mini", text: "..." }
  ▼
FastAPI backend (port 8000)
  │
  │  POST http://localhost:8001/extract
  │  { text: "...", embedding_model: "bge_m3", llm_model: "gpt-4o-mini" }
  ▼
Wikontic service (port 8001)
  │
  │  { triplets: [{subject, subject_type, relation, object, object_type}], count: N }
  ▼
FastAPI backend
  │  → maps fields to Turkish schema
  │  → builds highlight list from unique subjects
  │
  │  { triplets: [{baş, baş_tipi, ilişki, uç, uç_tipi}], highlight: [...] }
  ▼
Browser → renders interactive graph card
```

### Changing the Wikontic port

If your Wikontic service runs on a port other than `8001`, update `backend/.env`:

```env
WIKONTIC_URL=http://localhost:9000
```

No code changes are needed — the backend reads this variable at startup.

---

## Project Structure

```
Bilgi-Grafi-i-Product-Phase/
├── start.sh                        # Starts backend + frontend together
├── start.bat                       # Windows equivalent
│
├── backend/
│   ├── main.py                     # FastAPI app — /api/models, /api/extract, /api/visualize
│   ├── llm.py                      # OpenRouter LLM call + triplet parser
│   ├── .env                        # API keys and service URLs (not committed)
│   ├── allowedOpenroutherLLMModels.json  # Model list served to the frontend
│   ├── visualization/
│   │   ├── __init__.py
│   │   ├── graph.py                # pyvis-based HTML graph builder
│   │   └── requirements.txt        # pyvis
│   └── wikipedia/
│       ├── systemPrompt.jsonl      # Turkish KG extraction system prompt
│       └── requirements.txt        # fastapi, uvicorn, requests, beautifulsoup4, httpx
│
└── frontend/
    ├── index.html
    ├── vite.config.js              # Proxies /api → http://localhost:8000
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx                 # Root component — state, layout, API calls
        ├── App.css                 # All styles
        ├── GraphCanvas.jsx         # Background decorative graph animation
        ├── PlusGraph.jsx           # D3 force-graph node selector for method choice
        ├── ResultCard.jsx          # Single graph result card with vis-network embed
        └── visualization/
            └── KGGraph.jsx         # iframe wrapper that calls /api/visualize
```
