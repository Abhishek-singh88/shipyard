# Shipyard

**Shipyard** is an AI-powered Continuous Deployment Platform that automates the full lifecycle of deploying containerized applications to Kubernetes — from a `git push` to live deployment, real-time verification, automatic rollback, and AI-generated incident diagnosis.

---

## Architecture

```
┌──────────────┐   webhook    ┌─────────────┐   Bull queue  ┌──────────────┐
│   GitHub     │ ──────────── │   Backend   │ ────────────  │    Worker    │
│  (git push)  │              │  (Express)  │               │  (Pipeline)  │
└──────────────┘              └─────────────┘               └──────┬───────┘
                                     │                             │
                                     │ Prisma                      │ K8s SDK
                                     ▼                             ▼
                              ┌─────────────┐              ┌──────────────┐
                              │  PostgreSQL  │              │  Kubernetes  │
                              └─────────────┘              └──────────────┘
                                                                  │
                              ┌─────────────┐              ┌──────▼───────┐
                              │  Next.js    │              │  Prometheus  │
                              │  Dashboard  │              │  (Metrics)   │
                              └─────────────┘              └──────────────┘
                                                                  │
                                                           ┌──────▼───────┐
                                                           │  Gemini AI   │
                                                           │  (Diagnosis) │
                                                           └──────────────┘
```

---

## Prerequisites

- **Node.js** v20+
- **Docker** and **Docker Compose**
- **kubectl** configured for a local cluster (`kind` or `minikube` recommended)
- A **GitHub** account to set up webhooks

---

## Getting Started

### 1. Start Infrastructure

```bash
cd docker
docker-compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Prometheus** on port `9090`

### 2. Setup the Backend

```bash
cd backend
npm install

# Generate Prisma client and push schema to DB
npx prisma generate
npx prisma db push

# Start the development server
npm run dev
```

The backend API will be available at `http://localhost:4000`.

### 3. Setup the Worker

```bash
cd worker
npm install
npx prisma generate

# Fill in your GEMINI_API_KEY in worker/.env

npm run dev
```

### 4. Setup the Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

---

## Environment Variables

### `backend/.env`

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `REDIS_URL` | Redis connection string |

### `worker/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `PROMETHEUS_URL` | Prometheus query API URL |
| `GEMINI_API_KEY` | Google Gemini API key for AI diagnosis |
| `REGISTRY_URL` | Docker registry URL (leave empty for local-only) |
| `REGISTRY_USER` | Docker registry username |
| `REGISTRY_PASSWORD` | Docker registry password |

---

## Setting Up GitHub Webhooks

1. Go to your GitHub repository → **Settings** → **Webhooks** → **Add webhook**
2. Set **Payload URL** to `http://YOUR_SERVER_IP:4000/api/webhook/github`
3. Set **Content type** to `application/json`
4. Set **Secret** to match the `webhookSecret` you entered when creating the repository in Shipyard
5. Select **Just the push event**
6. Click **Add webhook**

---

## Project Structure

```
shipyard/
├── backend/           # Express + TypeScript REST API
│   ├── src/
│   │   ├── routes/    # auth, repositories, deployments, webhook, incidents
│   │   ├── middleware/# JWT authentication
│   │   └── lib/       # Prisma client, JWT helpers
│   └── prisma/        # Database schema and migrations
│
├── frontend/          # Next.js + TypeScript Dashboard
│   ├── app/           # App Router pages
│   ├── components/    # Reusable UI components
│   └── lib/           # API client, auth helpers
│
├── worker/            # Deployment pipeline worker
│   └── src/
│       ├── pipeline/  # clone, build, deploy, orchestrator
│       ├── verification/ # Prometheus polling + rollback
│       └── diagnosis/ # Evidence collection + Gemini AI
│
├── docker/            # Docker Compose + Prometheus config
└── k8s/               # Kubernetes manifest templates
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend API | Express, TypeScript, Prisma |
| Database | PostgreSQL |
| Job Queue | Bull + Redis |
| Container Build | Docker (via Dockerode) |
| Kubernetes | @kubernetes/client-node |
| Metrics | Prometheus |
| AI Diagnosis | Google Gemini 1.5 Pro |
