FROM node:22-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
RUN npm run build


FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    ALLOW_DEMO_SEED_DATA=false \
    API_HOST=0.0.0.0 \
    API_PORT=8000 \
    PERSISTENT_DATA_DIR=/data

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY --from=frontend-build /frontend/dist /app/frontend/dist

RUN addgroup --system --gid 10001 app \
    && adduser --system --uid 10001 --ingroup app --home /app --no-create-home app \
    && mkdir -p /data/uploads \
    && chown -R app:app /data \
    && chmod 0750 /data /data/uploads

EXPOSE 8000

USER app:app
WORKDIR /app/backend
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
