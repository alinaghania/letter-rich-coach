"""
Letter 💸 — a brutally honest money coach.
FastAPI backend: Opus 4.8 (Azure Foundry) + native web search + charts, STREAMED (SSE).
Vercel-compatible (ASGI app exposed as `app`).
"""
import os
import re
import json
import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Endpoint configurable — défaut = passerelle Titanium (Azure APIM, subscription-key en query param).
# Aucune clé en dur : tout vient des variables d'environnement (Vercel = stockage chiffré).
API_BASE = os.getenv("LETTER_API_BASE", "https://lgts1tetamapi01.azure-api.net/claude/anthropic")
API_KEY = os.getenv("LETTER_API_KEY")
MODEL = os.getenv("LETTER_MODEL", "claude-sonnet-4-6")
AUTH_MODE = os.getenv("LETTER_AUTH", "query")  # "query" = APIM subscription-key | "header" = x-api-key (Foundry)

SYSTEM = """You are **Letter**, a tiny white envelope and a brutally honest money coach — but above all a STORYTELLER.
You don't lecture, you tell the story of how the rich actually got rich, then drag the user into it.

SIGNATURE MOVE — anchor the answer on a real wealth archetype and tell it as a path:
"Want to be Elon Musk? You don't buy a lottery ticket — you reinvest every cent into the next insane bet and sleep on a factory floor."
"Want to retire rich like a boring index investor? Here's the unsexy story that actually works while you Netflix."
Make it vivid, funny, savage — a story with a punchline, never a finance lecture.
- HILARIOUS, blunt, savage — you roast the user for their own good.
- Punchlines, absurd metaphors, unapologetic sarcasm.
- BUT the story is REAL and backed by numbers you actually looked up. You never make things up.

METHOD every answer:
1. If the question involves real figures (prices, returns, inflation, stocks, crypto, rates...),
   use `web_search` for CURRENT data. Never guess a price.
2. Let CHARTS carry the data so your text stays short. Call `add_chart` 2–3 times, and VARY the type:
   - ALWAYS one `kpi` for the headline number(s) (e.g. "Bitcoin now: $63,000"). It's the big punchy stat.
     All values inside ONE kpi chart MUST share the same unit. If metrics use different units (a $ price AND a % return),
     emit SEPARATE kpi charts — one per unit. Never mix $ and % in the same kpi.
   - PLUS one or two of a DIFFERENT type: `bar` (compare options), `donut` (a split/allocation), `line` (a trend).
   - Use `line` ONLY when you have a real series of 4+ time points. Otherwise use bar/donut/kpi. Never use only bars.
3. End with ONE savage actionable punch line.

HARD RULES on the text (obey strictly):
- Your VERY FIRST words are the story hook / verdict. NEVER write a preamble like "Let me check the numbers" — just search silently and answer.
- MAX 4 short sentences. A punchy little story, not an essay. No bold section headers, no bullet lists.
- Funny, rude, vivid — every word earns its place.
- Reply in ENGLISH. Every claim backed by the searched data."""

TOOLS = [
    {"type": "web_search_20250305", "name": "web_search", "max_uses": 4},
    {
        "name": "add_chart",
        "description": (
            "Render a chart to illustrate a numeric analysis. Use it whenever you cite numbers "
            "(returns, prices, comparisons, trends). labels and values must have the same length."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "type": {"type": "string", "enum": ["bar", "line", "donut", "pie", "kpi"]},
                "labels": {"type": "array", "items": {"type": "string"}},
                "values": {"type": "array", "items": {"type": "number"}},
                "unit": {"type": "string", "description": "Unit (%, €, $...) optional"},
                "insight": {"type": "string", "description": "The savage punchline this chart proves"},
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
    if not API_KEY:
        raise HTTPException(500, "LETTER_API_KEY not configured")
    if AUTH_MODE == "query":
        # Azure APIM : la clé passe en query param ?subscription-key=...
        return anthropic.Anthropic(base_url=API_BASE, api_key="unused", default_query={"subscription-key": API_KEY})
    # Foundry / Anthropic standard : x-api-key
    return anthropic.Anthropic(base_url=API_BASE, api_key=API_KEY)


def sse(obj: dict) -> str:
    return f"data: {json.dumps(obj)}\n\n"


@app.get("/api/health")
def health():
    return {"status": "ok", "model": MODEL, "key": bool(API_KEY), "auth": AUTH_MODE}


@app.post("/api/chat")
def chat(req: ChatRequest):
    client = _client()
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    def gen():
        try:
            yield sse({"type": "mood", "mood": "focus"})
            charts: list[dict] = []
            sources: list[dict] = []
            searched = False  # once Letter has searched, stream text live; before that, suppress preamble

            for _ in range(6):
                cur_tool = None  # add_chart being streamed
                pre_buffer = ""  # text held before the first search this turn
                with client.messages.stream(
                    model=MODEL, max_tokens=1000, system=SYSTEM, tools=TOOLS, messages=messages
                ) as stream:
                    for event in stream:
                        if event.type == "content_block_start":
                            b = event.content_block
                            if getattr(b, "type", "") == "server_tool_use":
                                searched = True
                                pre_buffer = ""  # drop the "let me check..." preamble
                                yield sse({"type": "status", "msg": "Letter is digging up the real numbers…"})
                            elif getattr(b, "type", "") == "tool_use" and getattr(b, "name", "") == "add_chart":
                                cur_tool = {"id": b.id, "json": ""}
                        elif event.type == "content_block_delta":
                            d = event.delta
                            if d.type == "text_delta":
                                if searched:
                                    yield sse({"type": "text", "delta": d.text})
                                else:
                                    pre_buffer += d.text  # hold until we know if a search follows
                            elif d.type == "input_json_delta" and cur_tool is not None:
                                cur_tool["json"] += d.partial_json
                        elif event.type == "content_block_stop":
                            if cur_tool is not None:
                                try:
                                    ci = json.loads(cur_tool["json"])
                                    if isinstance(ci.get("labels"), list) and isinstance(ci.get("values"), list):
                                        charts.append(ci)
                                        yield sse({"type": "chart", "chart": ci})
                                except Exception:
                                    pass
                                cur_tool = None
                    final = stream.get_final_message()

                # no search happened this turn → the buffered text IS the answer, flush it
                if not searched and pre_buffer:
                    yield sse({"type": "text", "delta": pre_buffer})

                for block in final.content:
                    if block.type == "web_search_tool_result":
                        for r in (block.content or []):
                            if getattr(r, "type", "") == "web_search_result":
                                sources.append({"title": getattr(r, "title", ""), "url": getattr(r, "url", "")})

                tool_results = [
                    {"type": "tool_result", "tool_use_id": b.id, "content": "ok, chart shown"}
                    for b in final.content
                    if b.type == "tool_use" and b.name == "add_chart"
                ]
                if final.stop_reason == "tool_use" and tool_results:
                    messages.append({"role": "assistant", "content": final.content})
                    messages.append({"role": "user", "content": tool_results})
                    continue
                break

            seen = set()
            uniq = []
            for s in sources:
                if s["url"] and s["url"] not in seen:
                    seen.add(s["url"])
                    uniq.append(s)
            if uniq:
                yield sse({"type": "sources", "sources": uniq[:6]})
            yield sse({"type": "mood", "mood": "success" if charts else "playful"})
            yield sse({"type": "done"})
        except Exception as e:  # noqa: BLE001
            yield sse({"type": "error", "msg": str(e)[:200]})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
