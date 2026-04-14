import json
import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from visualization import build_graph_html
from llm import extract_triplets

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

BASE_DIR       = os.path.dirname(__file__)
MODELS_FILE    = os.path.join(BASE_DIR, "allowedOpenroutherLLMModels.json")
WIKONTIC_URL   = os.getenv("WIKONTIC_URL", "http://localhost:8001")


# ── Models ────────────────────────────────────────────────────────────────────

@app.get("/api/models")
def get_models():
    with open(MODELS_FILE, encoding="utf-8") as f:
        return json.load(f)


# ── Extraction ────────────────────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    text:            str
    model:           str
    prompt_type:     str = "temel"      # temel | dspy | textgrad
    kg_type:         str = "wikipedia"  # wikipedia | wicontic | kggen
    embedding_model: str = "contriever" # contriever | bge_m3 | turkish_e5_large | mft_random


async def _extract_wikontic(text: str, llm_model: str, embedding_model: str) -> list[dict]:
    """Calls the Wikontic service and normalises response to the app's Turkish field names."""
    payload = {
        "text":            text,
        "embedding_model": embedding_model,
        "llm_model":       llm_model,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(f"{WIKONTIC_URL}/extract", json=payload)
        resp.raise_for_status()

    raw_triplets = resp.json().get("triplets", [])

    # Map Wikontic field names → app field names
    normalised = []
    for t in raw_triplets:
        normalised.append({
            "baş":      t.get("subject", ""),
            "baş_tipi": t.get("subject_type", ""),
            "ilişki":   t.get("relation", ""),
            "uç":       t.get("object", ""),
            "uç_tipi":  t.get("object_type", ""),
        })
    return normalised


@app.post("/api/extract")
async def extract(body: ExtractRequest):
    try:
        if body.kg_type == "wicontic":
            triplets = await _extract_wikontic(body.text, body.model, body.embedding_model)
        else:
            triplets = await extract_triplets(body.text, body.model)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Baş varlıkları highlight olarak döndür
    highlight = list({t.get("baş", "") for t in triplets if t.get("baş")})
    return {"triplets": triplets, "highlight": highlight}


# ── Visualization ─────────────────────────────────────────────────────────────

class Triple(BaseModel):
    baş:      str
    baş_tipi: str = ""
    ilişki:   str
    uç:       str
    uç_tipi:  str = ""


class VisualizeRequest(BaseModel):
    triplets: list[Triple]
    highlight: list[str] = []


@app.post("/api/visualize", response_class=HTMLResponse)
def visualize(body: VisualizeRequest):
    triplets = [t.model_dump() for t in body.triplets]
    html = build_graph_html(triplets, highlight_entities=body.highlight)
    return HTMLResponse(content=html)
