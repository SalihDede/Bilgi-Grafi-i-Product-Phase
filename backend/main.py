import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from visualization import build_graph_html
from llm import extract_triplets

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

BASE_DIR    = os.path.dirname(__file__)
MODELS_FILE = os.path.join(BASE_DIR, "allowedOpenroutherLLMModels.json")


# ── Models ────────────────────────────────────────────────────────────────────

@app.get("/api/models")
def get_models():
    with open(MODELS_FILE, encoding="utf-8") as f:
        return json.load(f)


# ── Extraction ────────────────────────────────────────────────────────────────

class ExtractRequest(BaseModel):
    text:        str
    model:       str
    prompt_type: str = "temel"      # temel | dspy | textgrad
    kg_type:     str = "wikipedia"  # wikipedia | wicontic | kggen


@app.post("/api/extract")
async def extract(body: ExtractRequest):
    try:
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
