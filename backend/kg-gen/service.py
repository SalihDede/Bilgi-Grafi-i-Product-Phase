"""kg-gen microservice — /extract endpoint (same contract as wicontic)."""
import logging
import os
import traceback
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.kg_gen.kg_gen import KGGen

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kg_gen_service")

API_KEY       = os.getenv("OPENROUTER_API_KEY", "")
API_BASE      = os.getenv("LLM_BASE_ADDRESS", "https://openrouter.ai/api/v1")
DEFAULT_MODEL = os.getenv("LLM_MODEL", "google/gemini-2.5-flash-lite")

app = FastAPI(title="kg-gen service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_kg = KGGen(
    model=f"openrouter/{DEFAULT_MODEL}",
    api_key=API_KEY,
    api_base=API_BASE,
)


class ExtractRequest(BaseModel):
    text: str
    llm_model: str = DEFAULT_MODEL


@app.post("/extract")
def extract(body: ExtractRequest):
    model = body.llm_model
    if not model.startswith("openrouter/"):
        model = f"openrouter/{model}"

    if model != _kg.model:
        _kg.init_model(model=model, api_key=API_KEY, api_base=API_BASE)

    try:
        graph = _kg.generate(input_data=body.text)
    except Exception as exc:
        logger.error("KGGen extraction failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc))

    triplets = [
        {
            "subject":      subj,
            "subject_type": "",
            "relation":     pred,
            "object":       obj,
            "object_type":  "",
        }
        for subj, pred, obj in graph.relations
    ]
    logger.info("Extracted %d triplets", len(triplets))
    return {"triplets": triplets}
