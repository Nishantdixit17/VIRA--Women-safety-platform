# VIRA — Predictive Women's Safety Intelligence Platform

> **"Don't just detect danger. Predict it. Explain it. Prevent it."**
>
> *From reactive emergency response to proactive safety intelligence. Complements India's ERSS-112 and Safe City systems.*

---

## 1. Executive Summary & SIH Positioning

### One-Line Pitch
**"Vira is an AI-powered predictive safety platform that identifies and explains dynamic risk zones, recommends safer routes, monitors journeys with user consent, and intelligently connects women with trusted contacts and emergency responders."**

### Unique Selling Proposition (USP)
**"Existing systems primarily tell you what happened or help after an emergency. Vira adds the missing intelligence layer: it predicts risk, explains the reasons behind that risk, recommends preventive action, and creates a consent-based bridge between the woman, her trusted circle, and the response ecosystem."**

### Core Operational Flow
`PREDICT` → `EXPLAIN` → `PREVENT` → `PROTECT` → `RESPOND`

---

## 2. Demo Credentials (For Judges)

These accounts are pre-seeded in `prisma/dev.db` and have one-tap fill buttons on `/login`:

| Role | Name | Email | Password | Default Landing |
| :--- | :--- | :--- | :--- | :--- |
| **Commuter (`USER`)** | Ananya Sharma | `ananya@vira.safety` | `vira1234` | `/explore` |
| **Nodal Officer (`ADMIN`)** | ACP Kavita Deshmukh | `admin@vira.safety` | `admin1234` | `/admin` |

---

## 3. Setup & Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Apply Prisma migrations to local SQLite database
npx prisma migrate dev --name init

# 3. Seed realistic corridors, safe havens, reviews, alerts, and hash-chained vault
npm run db:seed

# 4. Run automated unit tests (Risk Engine, SHA-256 Evidence Chain, Vira Intent Parser)
npm test

# 5. Start the development server at http://localhost:3000
npm run dev
```

---

## 4. Environment Variables (`.env.example`)

The entire platform runs **100% locally without any external API keys** using the built-in explainable risk engine and deterministic intent/rule engine. Optionally, configure Gemini or OpenAI for Vira's conversational LLM layer:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="vira-sih-predictive-safety-secret-key-2026"
LLM_PROVIDER="gemini" # gemini | openai
GEMINI_API_KEY=""
OPENAI_API_KEY=""
MODEL_NAME="gemini-2.0-flash"
```

---

## 5. Folder Structure & Architecture

```text
├── prisma/
│   ├── schema.prisma        # Portable database schema (SQLite default; Postgres/PostGIS ready)
│   └── seed.ts              # Seeds 8 Delhi road segments, 6 Safe Havens, reviews, alerts, users & vault
├── public/
│   ├── manifest.json        # PWA installable manifest
│   ├── sw.js                # Offline Service Worker caching app shell, risk data & emergency numbers
│   └── icon.svg             # Brand shield icon
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Public Landing Page (7 sections, Quick-Start Planner, Preview Row)
│   │   ├── login/page.tsx           # Judge Demo Login with one-tap credential fill
│   │   ├── register/page.tsx        # Privacy-first account registration
│   │   ├── explore/page.tsx         # Safety Discovery Map (6 PM - 2 AM slider, filter chips, WHY panel)
│   │   ├── places/[slug]/page.tsx   # Area Safety Dossier (hourly Recharts curve, 6 factors, safe havens)
│   │   ├── planner/page.tsx         # AI Safe Journey Planner (Fastest / Balanced / Safest routes)
│   │   ├── journey/page.tsx         # Live Monitored Journey (deviation prompt + 10s escalation, check-in)
│   │   ├── sos/page.tsx             # SOS Emergency Center (5s countdown, Web Audio siren, Silent SOS)
│   │   ├── circle/page.tsx          # Consent-Based Trusted Circle (WHO, WHEN, WHAT, HOW LONG)
│   │   ├── reviews/page.tsx         # Community Safety Reviews (1-5 ratings, anonymous toggle, confidence)
│   │   ├── alerts/page.tsx          # Real-Time Alerts (SSE live stream, simulated alerts, admin broadcast)
│   │   ├── evidence/page.tsx        # SHA-256 Hash-Chained Evidence Vault & Tamper Detector
│   │   ├── settings/page.tsx        # Offline Mode, SMS Fallback with place name, Privacy Audit Log
│   │   ├── admin/page.tsx           # Authority Dashboard (Police/Municipal/University views, broadcast)
│   │   └── api/                     # Next.js Route Handlers (auth, risk, planner, places, reviews, alerts, circle, evidence, vira)
│   ├── components/
│   │   ├── layout/                  # AppShell (Desktop sidebar + Mobile bottom tab bar) & GlobalSosOverlay
│   │   ├── map/                     # Dynamic Leaflet Map + OSRM polylines + Safe Haven markers
│   │   ├── ui/                      # Custom SVG animated SirenIcon & 5-level accessible RiskBadge
│   │   └── vira/                    # ViraAvatar3D (@react-three/fiber + @pixiv/three-vrm) & ViraCompanionPanel
│   ├── lib/
│   │   ├── engine/                  # risk-engine.ts, route-planner.ts, evidence-chain.ts, distress-detector.ts, vira-intents.ts
│   │   └── repositories/            # Data access layer abstracting Prisma queries
│   └── store/
│       └── useSafetyStore.ts        # Global Zustand state for SOS, Live Journey, and Vira 3D Companion
└── tests/
    └── engines.test.ts              # Vitest suite for Risk Engine, Hash Chain, and Vira Intent/Distress engines
```

---

## 6. How to Swap SQLite for PostgreSQL / PostGIS & Real Data Sources

1. **Swap SQLite for PostgreSQL / PostGIS**:
   - In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
   - Set `DATABASE_URL="postgresql://user:password@localhost:5432/vira_safety?schema=public"` in `.env`.
   - Run `npx prisma migrate deploy`.
2. **Swap Seeded Data for Live Safe City / ERSS-112 Feeds**:
   - All database access is encapsulated in `src/lib/repositories/zones-repo.ts`, `safety-repo.ts`, and `evidence-repo.ts`.
   - Replace the Prisma calls inside those repository functions with your municipal smart-pole lighting API, police PCR CAD feed, or PostGIS spatial queries without changing any UI components or route handlers.
