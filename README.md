# Letter 💸 — ton coach pour devenir riche (sans pitié)

App du **IDE Challenge** (Titanium Engineer Program). Un chat où tu parles à **Letter**, une
mascotte-enveloppe au caractère impossible qui te donne des conseils financiers **rudes et drôles**,
mais basés sur une **vraie recherche web** et illustrés par des **graphiques**.

## Stack
- **Backend** : FastAPI (`api/index.py`) — Claude **Opus 4.8** (Azure Foundry) + `web_search` natif + outil `add_chart`
- **Frontend** : Next.js 14 (App Router) + Recharts, style flat warm
- **Déploiement** : Vercel (FastAPI serverless `/api` + Next.js)

## Lancer en local
```bash
# backend
pip install -r api/requirements.txt
uvicorn api.index:app --port 8000
# frontend (autre terminal)
npm install && npm run dev   # http://localhost:3000
```

## Variables d'environnement
| Clé | Rôle |
|---|---|
| `ANTHROPIC_FOUNDRY_API_KEY` | clé Azure Foundry (Anthropic) |
| `ANTHROPIC_FOUNDRY_BASE_URL` | endpoint Foundry |
| `LETTER_MODEL` | `claude-opus-4-8` |

Ne jamais committer `.env`.
