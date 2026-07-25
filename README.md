# Asset Guardian

Production-ready IT Asset Management platform for small offices — tracks hardware inventory, automates discovery via a lightweight PowerShell agent, and gives IT admins full audit visibility. Bilingual (English / Arabic, LTR / RTL).

## Monorepo Layout

```
ertekaa-asset-guardian/
├── agent/                 PowerShell background collection agent + silent installer
├── backend/                Express + PostgreSQL (Sequelize) REST API
└── frontend/                React + Vite + TypeScript SPA
```

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 13+ (you already have an instance — see `backend/.env.example`)
- Windows endpoints (for agent deployment) with PowerShell 5.1+

## Quick Start

```bash
# 1. Install all workspace dependencies
npm run install:all

# 2. Configure the backend
cp backend/.env.example backend/.env
# edit backend/.env with your PostgreSQL credentials and a strong JWT_SECRET / AGENT_API_KEY

# 3. Run both servers concurrently
npm run dev
```

- Backend API → `http://localhost:5000`
- Frontend SPA → `http://localhost:5173`

On first launch, the frontend will detect that no administrator account exists yet and present a **Setup Wizard** to create the first Super Admin account. Subsequent logins use standard JWT-based email/password auth.

## Database

Sequelize is configured to auto-sync models on boot in development (`sequelize.sync({ alter: true })`). For production, disable this and introduce proper migrations (e.g. `sequelize-cli`).

Tables created:
- `users` — IT administrator accounts (Super Admin / IT Admin / Read-Only Auditor)
- `devices` — active inventory (the 19 tracked parameters)
- `pending_assets` — staging queue for agent-submitted devices awaiting approval
- `audit_logs` — global + per-device event trail
- `dropdown_values` — managed dropdown options (Departments, Locations)

## The Agent

`agent/tracker-agent.ps1` collects WMI telemetry (hostname, serial, MAC, CPU, RAM, OS, IP) and POSTs it as JSON to `POST /api/agent/stage`, authenticated with a shared static API key (`AGENT_API_KEY` in `.env`, matching the key baked into the script or passed via `-ApiKey`).

`agent/install-agent.bat` registers the script as a Windows Task Scheduler task that runs silently at system startup and repeats every 15 minutes.

Deploy via GPO using the command generated for you in **Settings → Agent Deployment Hub**.

## Bilingual Support

Powered by `react-i18next`. Toggle EN / عربي from the header. Arabic switches `<html dir="rtl">` and the entire UI mirrors using CSS logical properties — no separate RTL stylesheet needed.

## Environment Variables

See `backend/.env.example` for the full list, including `DB_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `AGENT_API_KEY`, `CORS_ORIGIN`, and `PORT`.
