# CampusPulse

AI-powered campus problem intelligence platform (mini project).

**Workflow:** Student Report → Understand → Group Similar Reports → Prioritize → Route to Department → Resolve → Learn

> **Phase 1 status:** project scaffolding, database, and core report CRUD are
> implemented. The AI pipeline (classification, embeddings, duplicate
> detection, priority scoring, routing) is **not implemented yet** — reports
> are stored with placeholder category/severity/priority/department values
> until Phase 2/3. Admin authentication is also not implemented yet (the
> admin dashboard is open, no login) — planned as a follow-up before Phase 2.

## Stack

| Layer     | Tech                                  |
|-----------|----------------------------------------|
| Frontend  | Next.js (App Router) + TypeScript      |
| Backend   | FastAPI + SQLAlchemy                   |
| Database  | PostgreSQL (`pgvector` image, ready for Phase 3) |
| AI        | Not wired up yet (Phase 2+)            |

## Project structure

```
CampusPulse/
├── backend/            # FastAPI app
│   ├── app/
│   │   ├── main.py         # app entrypoint, CORS, error handlers, routers
│   │   ├── config.py       # env-based settings
│   │   ├── db/              # SQLAlchemy models, session, dev init/seed
│   │   ├── routers/         # health, reports, departments
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── services/        # business logic (report_service, tracking)
│   │   └── core/errors.py   # centralized exception -> JSON error handling
│   ├── requirements.txt
│   └── .env.example
├── frontend/           # Next.js app
│   ├── app/
│   │   ├── page.tsx          # home: health check + report submission form
│   │   ├── track/[code]/     # student tracking page
│   │   └── admin/             # admin dashboard (list reports, no auth yet)
│   ├── lib/api.ts             # fetch wrapper + typed API client
│   └── .env.local.example
├── docker-compose.yml   # Postgres (pgvector) for local dev
└── README.md
```

## Prerequisites

- Python 3.11+
- Node.js 18.17+ (tested with Node 24)
- Docker Desktop (for Postgres) — or a local Postgres 14+ instance

## Running locally

### 1. Database

```bash
docker compose up -d
```

This starts Postgres (with the `pgvector` extension available, for later
phases) on `localhost:5432` with user/password/db all set to `campuspulse`
(see `docker-compose.yml`).

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
copy .env.example .env        # Windows: copy, macOS/Linux: cp
uvicorn app.main:app --reload
```

The API starts on `http://localhost:8000`. On startup it creates tables and
seeds the department list automatically if the database is reachable — if
not, the API still starts (only DB-backed endpoints will fail until Postgres
is up).

Check it:
- `GET http://localhost:8000/health` → `{"status": "ok", ...}`
- `GET http://localhost:8000/health/db` → `{"status": "ok", "database": "connected"}`
- Interactive API docs: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
copy .env.local.example .env.local   # Windows: copy, macOS/Linux: cp
npm run dev
```

Open `http://localhost:3000`. The home page shows live backend health status
and a report submission form; submitting gives you a tracking code you can
use at `/track/<code>`. `/admin` lists all submitted reports.

## API endpoints (Phase 1)

| Method | Path                          | Description                                   |
|--------|-------------------------------|------------------------------------------------|
| GET    | `/health`                     | Liveness check, no DB dependency               |
| GET    | `/health/db`                  | Checks DB connectivity                          |
| POST   | `/reports`                    | Submit a new report                             |
| GET    | `/reports`                    | List reports (filter by status/department/category) |
| GET    | `/reports/track/{code}`       | Public lookup by tracking code (student use)   |
| GET    | `/reports/{id}`                | Full report detail (admin use)                 |
| PATCH  | `/reports/{id}`                | Update status/department/severity, logs an event |
| GET    | `/departments`                 | List seeded departments                         |

## What's deliberately not built yet

- AI classification, embeddings, duplicate detection, priority scoring, department recommendation (Phase 2/3)
- Admin authentication (Phase 1.5)
- Image analysis (image is stored/displayed only)
- Notifications (email/SMS)
- Database migrations tool (Alembic) — schema is created via
  `Base.metadata.create_all` for now; introduced once the schema stabilizes

See the architecture doc discussed in project planning for the full phased
roadmap.
