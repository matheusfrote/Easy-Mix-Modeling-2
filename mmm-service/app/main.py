"""
Google Meridian microservice for production econometric Marketing Mix Modeling.
"""

import os
import sys
import json
import logging
from typing import Dict, Any

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("meridian-service")

app = Flask(__name__)
CORS(app)

MERIDIAN_AVAILABLE = False
MERIDIAN_VERSION = "N/A"
MERIDIAN_IMPORT_ERROR = None

try:
    import meridian
    from meridian.data import input_data
    from meridian.model import spec, model
    from meridian.analysis import analyzer, optimizer
    import tensorflow as tf
    import tensorflow_probability as tfp
    import arviz as az

    MERIDIAN_AVAILABLE = True
    MERIDIAN_VERSION = getattr(meridian, "__version__", "0.1.0")
    logger.info(f"Google Meridian carregado com sucesso (v{MERIDIAN_VERSION}).")
except Exception as e:
    MERIDIAN_IMPORT_ERROR = str(e)
    logger.warning(f"Google Meridian indisponível no ambiente Python: {e}")

from app.validator import validate_meridian_input, DataValidationError
from app.diagnostics import process_posterior_and_diagnostics


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy" if MERIDIAN_AVAILABLE else "degraded",
        "engine": "google-meridian",
        "engineVersion": MERIDIAN_VERSION,
        "meridianModuleLoaded": MERIDIAN_AVAILABLE,
        "importError": MERIDIAN_IMPORT_ERROR,
        "pythonVersion": sys.version
    }), 200


@app.route("/api/model/fit", methods=["POST"])
def fit_model():
    payload = request.get_json(silent=True) or {}
    rows = payload.get("rows", [])
    config = payload.get("config", {})

    if not rows:
        return jsonify({
            "status": "error",
            "engine": "google-meridian",
            "errors": [{"code": "EMPTY_ROWS", "message": "Nenhum dado fornecido no payload para modelagem."}]
        }), 400

    try:
        df = pd.DataFrame(rows)
        cleaned_df, valid_channels = validate_meridian_input(df, config)
    except DataValidationError as dve:
        return jsonify({
            "status": "validation_error",
            "engine": "google-meridian",
            "errors": [{"code": dve.code, "message": dve.message, "field": dve.field}]
        }), 422
    except Exception as e:
        return jsonify({
            "status": "validation_error",
            "engine": "google-meridian",
            "errors": [{"code": "DATA_PROCESSING_ERROR", "message": f"Erro no pré-processamento: {str(e)}"}]
        }), 400

    if not MERIDIAN_AVAILABLE:
        # Structured error reporting when Google Meridian cannot be executed in the Python environment
        return jsonify({
            "status": "service_unavailable",
            "engine": "google-meridian",
            "engineVersion": MERIDIAN_VERSION,
            "errors": [
                {
                    "code": "MERIDIAN_NOT_INSTALLED",
                    "message": f"O módulo oficial google-meridian não pôde ser inicializado: {MERIDIAN_IMPORT_ERROR}"
                }
            ]
        }), 503

    try:
        # 1. Pipeline Execution with Google Meridian
        date_col = config.get("dateColumn", "date")
        kpi_col = config.get("kpiColumn", "revenue")
        kpi_type = config.get("targetKpiType", "revenue")

        media_channels_config = config.get("mediaChannels", [])
        media_cols = [c["spendColumn"] for c in media_channels_config]

        # Build InputData
        builder = input_data.DataFrameInputDataBuilder(cleaned_df)
        builder = builder.with_kpi(kpi_col, kpi_type=kpi_type)
        builder = builder.with_media(media_cols)

        controls = config.get("controlColumns", [])
        if controls:
            builder = builder.with_controls(controls)

        built_input_data = builder.build()

        # 2. Model Spec
        model_spec = spec.ModelSpec()

        # 3. Instantiate Meridian
        meridian_model = model.Meridian(input_data=built_input_data, model_spec=model_spec)

        # 4. MCMC Sampling
        n_chains = int(config.get("mcmcChains", 4))
        n_draws = int(config.get("mcmcDraws", 1000))
        n_warmup = int(config.get("mcmcWarmup", 500))

        meridian_model.sample_posterior(
            n_chains=n_chains,
            n_adapt=n_warmup,
            n_burnin=n_warmup,
            n_keep=n_draws
        )

        # 5. Extract Analyzer & Metrics
        az_obj = analyzer.Analyzer(meridian_model)
        roi_df = az_obj.roi_summary()
        mroi_df = az_obj.marginal_roi_summary()

        # 6. Process diagnostics and posterior
        diagnostics = process_posterior_and_diagnostics(
            meridian_model, built_input_data, cleaned_df, config, valid_channels
        )

        return jsonify({
            "status": "completed",
            "modelId": f"meridian_{int(pd.Timestamp.now().timestamp())}",
            "engine": "google-meridian",
            "engineVersion": MERIDIAN_VERSION,
            "totalSpend": float(cleaned_df[media_cols].sum().sum()),
            "totalKpi": float(cleaned_df[kpi_col].sum()),
            "diagnostics": diagnostics,
            "channels": []
        }), 200

    except Exception as e:
        logger.error(f"Erro na execução do Meridian: {e}", exc_info=True)
        return jsonify({
            "status": "model_error",
            "engine": "google-meridian",
            "errors": [{"code": "MCMC_SAMPLING_FAILED", "message": f"Falha na inferência MCMC do Google Meridian: {str(e)}"}]
        }), 500


@app.route("/api/model/diagnostics", methods=["GET"])
def get_diagnostics():
    return jsonify({
        "status": "success",
        "engine": "google-meridian",
        "engineVersion": MERIDIAN_VERSION,
        "diagnosticsAvailable": MERIDIAN_AVAILABLE
    }), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
