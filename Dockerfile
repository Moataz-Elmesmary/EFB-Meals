# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Build backend and bundle frontend static files
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm install --production
COPY backend/ .
COPY --from=frontend-build /app/frontend/dist /app/backend/public

EXPOSE 4000
ENV PORT=4000
CMD ["node", "src/index.js"]
