"""
Bilgi grafı HTML üretici.
Wikontic'teki visualize_knowledge_graph() fonksiyonunun birebir kopyası;
Streamlit bağımlılığı olmadan saf HTML string döndürür.
"""

import os
import tempfile
from pyvis.network import Network

# ── Renk paleti (Wikontic ile aynı) ──────────────────────────────────────────
COLOR_DEFAULT     = "#C7C8CC"   # gri  – normal düğümler
COLOR_HIGHLIGHT   = "#B2CD9C"   # yeşil – vurgulanan düğümler
COLOR_EDGE        = "#000000"   # siyah – tüm kenarlar

# Ontoloji grafı renkleri
COLOR_ONT_CENTER  = "#4A90D9"   # mavi  – merkez varlık
COLOR_ONT_PARENT  = "#F5A623"   # turuncu – ebeveyn varlıklar
COLOR_ONT_SUBJ    = "#5CB85C"   # yeşil – subject property
COLOR_ONT_OBJ     = "#9B59B6"   # mor   – object property


_FILL_CSS = """
<style>
  html, body {
    margin: 0; padding: 0;
    width: 100%; height: 100%;
    overflow: hidden;
  }
  .card {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
  }
  #mynetwork {
    width: 100% !important;
    height: 100% !important;
  }
</style>"""


def _net_to_html(net: Network) -> str:
    """Pyvis Network → HTML string. iframe'i tamamen dolduracak CSS enjekte eder."""
    try:
        html = net.generate_html()
    except AttributeError:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".html") as tmp:
            net.save_graph(tmp.name)
            path = tmp.name
        with open(path, "r", encoding="utf-8") as f:
            html = f.read()
        os.remove(path)

    # <head> kapanmadan önce fill CSS'i enjekte et
    html = html.replace("</head>", _FILL_CSS + "\n</head>", 1)
    return html


def build_graph_html(
    triplets: list[dict],
    highlight_entities: list[str] | None = None,
    height: str = "100%",
) -> str:
    """
    Triplet listesinden interaktif graf HTML'i üretir.

    Parameters
    ----------
    triplets : [{"baş": ..., "baş_tipi": ..., "ilişki": ..., "uç": ..., "uç_tipi": ...}, ...]
    highlight_entities : vurgulanacak düğüm adları (yeşil gösterilir)
    height : iframe yüksekliği (varsayılan "100%")

    Returns
    -------
    Tam HTML string (vis-network.js gömülü, self-contained)
    """
    net = Network(
        height=height,
        width="100%",
        bgcolor="#ffffff",
        font_color="black",
        directed=True,
    )

    h_set = set(highlight_entities or [])
    added_nodes: set[str] = set()

    for t in triplets:
        s = str(t.get("baş", "") or "")
        r = str(t.get("ilişki", "") or "")
        o = str(t.get("uç", "") or "")
        if not s or not o:
            continue
        for node in (s, o):
            if node not in added_nodes:
                color = COLOR_HIGHLIGHT if node in h_set else COLOR_DEFAULT
                net.add_node(node, label=node, color=color)
                added_nodes.add(node)
        net.add_edge(s, o, label=r, color=COLOR_EDGE)

    return _net_to_html(net)


def build_ontology_graph_html(
    neighborhood: dict,
    height: str = "100%",
) -> str:
    """
    Wikidata ontoloji komşuluğunu görselleştirir.
    Wikontic'teki visualize_ontology_neighborhood() fonksiyonunun kopyası.

    neighborhood = {
        "center":  {"id": "Q5", "label": "human"},
        "parents": [{"id": "Q215627", "label": "person"}, ...],
        "properties": [{"id": "P31", "label": "instance of", "direction": "subject"}, ...]
    }
    """
    net = Network(
        height=height,
        width="100%",
        bgcolor="#ffffff",
        font_color="black",
        directed=True,
    )

    center = neighborhood["center"]
    net.add_node(
        center["id"],
        label=f"{center['label']}\n({center['id']})",
        color=COLOR_ONT_CENTER,
        size=25,
    )

    for parent in neighborhood.get("parents", []):
        net.add_node(
            parent["id"],
            label=f"{parent['label']}\n({parent['id']})",
            color=COLOR_ONT_PARENT,
            size=18,
        )
        net.add_edge(center["id"], parent["id"], label="is a",
                     color=COLOR_ONT_PARENT, dashes=True)

    for prop in neighborhood.get("properties", []):
        prop_node_id = f"prop_{prop['id']}"
        color = COLOR_ONT_SUBJ if prop["direction"] == "subject" else COLOR_ONT_OBJ
        direction_label = "→ subject" if prop["direction"] == "subject" else "← object"
        net.add_node(
            prop_node_id,
            label=f"{prop['label']}\n({prop['id']})\n{direction_label}",
            color=color,
            size=14,
            shape="box",
        )
        net.add_edge(center["id"], prop_node_id, label=prop["label"], color=color)

    return _net_to_html(net)
