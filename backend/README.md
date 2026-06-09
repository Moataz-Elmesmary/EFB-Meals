# Backend — Meals Service

Requirements: Node 18+, npm

Install and run:

```bash
cd backend
npm install
npm run dev
```

Environment variables: copy `.env.example` to `.env` and fill SMTP/SAP settings.

Endpoints:
- `GET /api/meals` — list available meals
- `POST /api/request` — create meal request
- `POST /api/request/:id/budget` — kitchen creates budget request (requires attachment)
- `POST /api/sap/push/:requestId` — push to SAP (stub)
