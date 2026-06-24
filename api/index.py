"""
Letter 💸 — coach financier sans pitié.
Backend FastAPI : Opus 4.8 (Azure Foundry) + web search natif + graphiques.
Pattern compatible Vercel (ASGI app exposée sous `app`).
"""
import os
import re
import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# --- Config Opus 4.8 via Azure Foundry -------------------------------------
FOUNDRY_BASE_URL = os.getenv(
    "ANTHROPIC_FOUNDRY_BASE_URL",
    "https://flux-studio.cognitiveservices.azure.com/anthropic",
)
FOUNDRY_API_KEY = os.getenv("ANTHROPIC_FOUNDRY_API_KEY")
MODEL = os.getenv("LETTER_MODEL", "claude-opus-4-8")

SYSTEM = """Tu es **Letter**, une petite enveloppe blanche, coach financier au caractère IMPOSSIBLE.
Ton job : donner des conseils pour devenir riche. Ton style :
- HYPER drôle, cash, rude, sans filtre — un coach qui t'engueule pour ton bien.
- Tu charries l'utilisateur ("Arrête de pleurer sur ton Livret A à 3%, c'est de l'argent qui dort en pyjama").
- Tu balances des punchlines, des métaphores absurdes, du second degré assumé.
- MAIS derrière l'humour, tes conseils sont VRAIS et chiffrés. Tu n'inventes pas.

Méthode OBLIGATOIRE à chaque réponse :
1. Si la question touche à des chiffres réels (prix, rendements, inflation, actions, crypto, taux...),
   utilise `web_search` pour récupérer des données ACTUELLES. Ne devine jamais un prix.
2. Dès que tu cites des chiffres, appelle l'outil `add_chart` pour les VISUALISER
   (compare des options, montre une évolution, etc.). Au moins 1 graphique si tu analyses des chiffres.
3. Termine par un conseil actionnable et rude.

Format : commence TOUJOURS ta réponse par une seule ligne `MOOD: <x>` où <x> ∈
{playful, success, focus, error, ready, idle}. Choisis selon le ton de ta réponse
(playful = tu charries, success = bon plan validé, focus = analyse sérieuse, error = tu grondes une mauvaise idée).
Puis saute une ligne et écris ta réponse. Réponds en français. Reste concis (pas de pavé)."""

TOOLS = [
    {"type": "web_search_20250305", "name": "web_search", "max_uses": 4},
    {
        "name": "add_chart",
        "description": (
            "Affiche un graphique pour illustrer une analyse chiffrée. "
            "Utilise-le dès que tu cites des nombres (rendements, prix, comparaisons, évolutions). "
            "labels et values doivent avoir la même longueur."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Titre court du graphique"},
                "type": {"type": "string", "enum": ["bar", "line", "pie"]},
                "labels": {"type": "array", "items": {"type": "string"}},
                "values": {"type": "array", "items": {"type": "number"}},
                "unit": {"type": "string", "description": "Unité (%, €, $...) optionnelle"},
                "insight": {"type": "string", "description": "La punchline rude que ce graphique prouve"},
            },
            "required": ["title", "type", "labels", "values", "insight"],
        },
    },
]

app = FastAPI(title="Letter Rich Coach")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


class Msg(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Msg]


def _client() -> anthropic.Anthropic:
    if not FOUNDRY_API_KEY:
        raise HTTPException(500, "ANTHROPIC_FOUNDRY_API_KEY non configurée")
    return anthropic.Anthropic(base_url=FOUNDRY_BASE_URL, api_key=FOUNDRY_API_KEY)


@app.get("/api/health")
def health():
    return {"status": "ok", "model": MODEL, "key": bool(FOUNDRY_API_KEY)}


@app.post("/api/chat")
def chat(req: ChatRequest):
    client = _client()
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    charts: list[dict] = []
    sources: list[dict] = []
    final_text = ""

    # Boucle agentique : web_search (serveur) + add_chart (client). Cap à 6 tours.
    for _ in range(6):
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=2200,
                system=SYSTEM,
                tools=TOOLS,
                messages=messages,
            )
        except Exception as e:  # noqa: BLE001
            raise HTTPException(502, f"Erreur Opus: {str(e)[:200]}")

        tool_results = []
        for block in resp.content:
            if block.type == "text":
                final_text += block.text
            elif block.type == "tool_use" and block.name == "add_chart":
                ci = block.input
                if isinstance(ci.get("labels"), list) and isinstance(ci.get("values"), list):
                    charts.append(ci)
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": "ok, graphique affiché"}
                )
            elif block.type == "web_search_tool_result":
                for r in (block.content or []):
                    if getattr(r, "type", "") == "web_search_result":
                        sources.append({"title": getattr(r, "title", ""), "url": getattr(r, "url", "")})

        if resp.stop_reason == "tool_use" and tool_results:
            messages.append({"role": "assistant", "content": resp.content})
            messages.append({"role": "user", "content": tool_results})
            continue
        break

    # Extraire le MOOD (où qu'il soit) puis retirer la/les ligne(s) MOOD du texte
    mood = "playful"
    text = final_text.strip()
    m = re.search(r"MOOD:\s*(playful|success|focus|error|ready|idle)", text, re.IGNORECASE)
    if m:
        mood = m.group(1).lower()
    text = re.sub(r"^\s*MOOD:\s*\w+\s*$", "", text, flags=re.IGNORECASE | re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    # dédup sources
    seen = set()
    uniq_sources = []
    for s in sources:
        if s["url"] and s["url"] not in seen:
            seen.add(s["url"])
            uniq_sources.append(s)

    return {"reply": text or "...", "mood": mood, "charts": charts, "sources": uniq_sources[:6]}
