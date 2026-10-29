# VIRA – Run & Host Guide

Requires Node.js 18.18+ (20 recommended).

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` (a ready `.env` is included in this package).
3. `npx prisma generate` then `npx prisma db push` (database file: `prisma/dev.db`)
4. Optional demo data: `npm run db:seed`
5. `npm run dev` and open http://localhost:3000
   (Windows: double-click `start-vira.bat`)

## Production / hosting
1. `npm install`
2. `npx prisma generate && npx prisma db push`
3. `npm run build` (needs internet once, to fetch the Inter font)
4. Start with `set NODE_ENV=production&& npx tsx server.ts` (Windows) or
   `NODE_ENV=production npx tsx server.ts` (Linux/macOS). Set `PORT` to change the port.

Host on any Node server (VPS, Render, Railway). Static-only hosts like plain
Netlify/GitHub Pages will not work because the app uses a Node server and SQLite.
For serverless hosts, switch `DATABASE_URL` in `prisma/schema.prisma` to a hosted DB (Postgres).

## Environment
- `DATABASE_URL`, `SESSION_SECRET` (change this in production)
- `GEMINI_API_KEY` / `OPENAI_API_KEY` (optional, for the AI copilot)
