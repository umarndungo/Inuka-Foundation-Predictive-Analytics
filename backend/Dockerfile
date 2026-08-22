# Inuka Risk Radar API + Bronze consumer (same image, different CMD).
# Build from repo root: docker compose build backend
FROM python:3.11-slim

WORKDIR /workspace

# libgomp required by xgboost at import/runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /workspace/backend/requirements.txt
RUN pip install --no-cache-dir -r /workspace/backend/requirements.txt

COPY backend/ /workspace/backend/
COPY data-pipeline/ /workspace/data-pipeline/

WORKDIR /workspace/backend
ENV PYTHONPATH=/workspace/backend
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
