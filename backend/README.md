# Backend — Meals Service

Requirements: Node 18+, npm, Docker (optional)

## Local run

```bash
cd backend
npm install
node src/index.js
```

Defaults:
- backend port: `4000`
- admin port: `3001`

## Environment

Copy `.env.example` to `.env` and fill these values:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `KITCHEN_EMAIL`
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`
- `MSSQL_HOST`, `MSSQL_USER`, `MSSQL_PASS`, `MSSQL_DB`
- `SAP_ENDPOINT` (optional)

## Docker

The root `Dockerfile` builds the frontend and backend together, then serves the built static files from the backend.

Build and run:

```bash
docker build -t efb-meals ..
docker run --rm -p 4000:4000 efb-meals
```

## Endpoints

- `GET /api/meals` — list available meals
- `POST /api/request` — create meal request
- `POST /api/kitchen/budget/:requestId` — kitchen creates budget request (requires attachment)
- `POST /api/sap/push/:requestId` — push to SAP / create SalesOrder
- `GET /admin/requests` — admin kitchen request list (protected by Azure auth if configured)
- `POST /admin/requests/:id/ready` — mark request ready for SAP
