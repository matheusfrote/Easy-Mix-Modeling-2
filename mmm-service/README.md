# Google Meridian Microservice (mmm-service)

Microserviço analítico em Python (FastAPI) para orquestração estatística do **Google Meridian** (Marketing Mix Model bayesiano).

## Endpoints Principais

- `GET /health`: Verificação de prontidão para o BFF Node.js (`MMMServiceClient`).
- `GET /api/v1/status`: Inspeção detalhada de módulos carregados (`google-meridian`, `tensorflow`, `arviz`), versão e ambiente.
- `POST /api/v1/meridian/ingest`: Validação de esquema, dados faltantes e conformidade temporal.
- `POST /api/v1/meridian/fit`: Ajuste bayesiano do modelo via No-U-Turn Sampler (NUTS).
- `POST /api/v1/meridian/optimize`: Otimização de alocação orçamentária via `meridian.analysis.optimizer`.
- `POST /api/v1/meridian/simulate`: Simulação de cenários What-If com distribuição preditiva posterior.

## Execução Local

```bash
cd mmm-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8008 --reload
```

## Diretriz de Integridade Estatística

Este serviço segue a política **Zero Fake Data**: caso o `google-meridian` ou suas dependências não estejam instaladas ou o processo falhe, o serviço responde com `HTTP 503 MERIDIAN_UNAVAILABLE` de forma transparente, sem gerar métricas de convergência ou intervalos de credibilidade fictícios.
