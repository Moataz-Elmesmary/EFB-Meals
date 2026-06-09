# EFB Meals — Kitchen Request Cloud App

A full-stack food request system designed to run locally or in the cloud.

Features:
- Backend: Express + SQLite, file uploads, email automation (nodemailer), SAP/MSSQL integration stubs, Microsoft login support.
- Frontend: React + Vite, Arabic/English i18n, animated UI, kitchen budget flow.
- Deployment: Docker-ready with GitHub workflow for container builds.

## Quick start

### Local run

```powershell
cd d:\Meals\backend
npm install
$env:PORT=4000
node src/index.js
```

```powershell
cd d:\Meals\frontend
npm install
npm run dev
```

Set `VITE_API_BASE=http://localhost:4000` in `frontend/.env` if needed.

### Docker / cloud-ready

Build the full app container:

```powershell
docker build -t efb-meals .
```

Run it locally on port 4000:

```powershell
docker run --rm -p 4000:4000 efb-meals
```

The frontend is served from the backend container after build.

### Cloud deployment

This repository includes a Dockerfile and GitHub Actions workflow under `.github/workflows/docker-build.yml`.

You can deploy the built container to container services such as:
- Google Cloud Run
- Azure Web App for Containers
- AWS Elastic Container Service / Fargate

## See also

- `backend/README.md`
- `frontend/README.md`
