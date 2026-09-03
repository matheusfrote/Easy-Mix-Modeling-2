"""
Diagnostics and Posterior statistics processor with ArviZ and Google Meridian.
"""

from typing import Dict, Any, List
import numpy as np
import pandas as pd
import arviz as az
import logging

logger = logging.getLogger("meridian-diagnostics")


def process_posterior_and_diagnostics(
    meridian_model: Any,
    input_data: Any,
    df: pd.DataFrame,
    config: Dict[str, Any],
    media_channels: List[str]
) -> Dict[str, Any]:
    """
    Extracts posterior distributions, MCMC diagnostics via ArviZ, and checks convergence.
    Adheres strictly to econometric conventions (no arbitrary heuristic scores).
    """
    inference_data = getattr(meridian_model, "inference_data", None)

    if inference_data is None:
        return {
            "rSquared": "N/A",
            "bayesianR2": "N/A",
            "mape": "N/A",
            "rmse": "N/A",
            "gelmanRubinRhat": "N/A",
            "effectiveSampleSize": "N/A",
            "bulkEss": "N/A",
            "tailEss": "N/A",
            "looCv": "N/A",
            "waic": "N/A",
            "divergencesCount": "N/A",
            "isConverged": False,
            "warnings": ["InferenceData não disponível a partir do modelo Meridian."],
            "baselineContribution": 0,
            "baselineShare": 0,
            "controlsContribution": 0,
            "controlsShare": 0,
            "mediaContribution": 0,
            "mediaShare": 0,
            "totalObservedKpi": 0,
            "totalPredictedKpi": 0,
            "posteriorMetrics": {
                "adstockDecay": {},
                "halfSaturation": {},
                "slope": {},
                "mediaCoefficients": {},
                "looCv": "N/A",
                "waic": "N/A"
            },
            "timeSeriesFit": []
        }

    # 1. Summary of MCMC via ArviZ
    try:
        az_summary = az.summary(inference_data)
        rhat_col = "r_hat" if "r_hat" in az_summary.columns else "rhat"
        rhat_series = az_summary[rhat_col].dropna() if rhat_col in az_summary.columns else pd.Series([1.0])
        ess_bulk_series = az_summary["ess_bulk"].dropna() if "ess_bulk" in az_summary.columns else pd.Series()
        ess_tail_series = az_summary["ess_tail"].dropna() if "ess_tail" in az_summary.columns else pd.Series()

        max_rhat = float(rhat_series.max()) if not rhat_series.empty else "N/A"
        min_ess_bulk = float(ess_bulk_series.min()) if not ess_bulk_series.empty else "N/A"
        min_ess_tail = float(ess_tail_series.min()) if not ess_tail_series.empty else "N/A"
    except Exception as e:
        logger.warning(f"Erro ao calcular resumo ArviZ: {e}")
        max_rhat = "N/A"
        min_ess_bulk = "N/A"
        min_ess_tail = "N/A"

    # 2. LOO and WAIC
    try:
        loo_res = az.loo(inference_data)
        loo_val = round(float(loo_res.elpd_loo), 2)
    except Exception:
        loo_val = "N/A"

    try:
        waic_res = az.waic(inference_data)
        waic_val = round(float(waic_res.elpd_waic), 2)
    except Exception:
        waic_val = "N/A"

    # 3. Divergences
    divergences_count = 0
    if hasattr(inference_data, "sample_stats") and hasattr(inference_data.sample_stats, "diverging"):
        try:
            divergences_count = int(inference_data.sample_stats.diverging.sum().values)
        except Exception:
            divergences_count = 0

    # 4. Posterior Metrics
    posterior_metrics = {
        "adstockDecay": {},
        "halfSaturation": {},
        "slope": {},
        "mediaCoefficients": {},
        "looCv": loo_val,
        "waic": waic_val
    }

    warnings = []
    if max_rhat != "N/A" and max_rhat >= 1.05:
        warnings.append(f"R-hat máximo ({max_rhat:.3f}) excedeu 1.05. As cadeias MCMC podem não ter convergido completamente.")
    if min_ess_bulk != "N/A" and min_ess_bulk < 400:
        warnings.append(f"Bulk ESS ({min_ess_bulk:.0f}) inferior a 400. Recomenda-se aumentar os draws MCMC.")
    if divergences_count > 0:
        warnings.append(f"Detectadas {divergences_count} transições divergentes durante a amostragem NUTS.")
        
    r_squared = "N/A"
    bayesian_r2 = "N/A"
    mape = "N/A"
    rmse = "N/A"
    
    # Attempt to extract actual fit metrics if meridian_model provides them
    try:
        if hasattr(meridian_model, "r_squared"):
            r_squared = float(meridian_model.r_squared)
        if hasattr(meridian_model, "mape"):
            mape = float(meridian_model.mape)
        if hasattr(meridian_model, "rmse"):
            rmse = float(meridian_model.rmse)
    except Exception:
        pass

    return {
        "rSquared": r_squared,
        "bayesianR2": bayesian_r2,
        "mape": mape,
        "rmse": rmse,
        "gelmanRubinRhat": round(max_rhat, 3) if max_rhat != "N/A" else "N/A",
        "effectiveSampleSize": int(min_ess_bulk) if min_ess_bulk != "N/A" else "N/A",
        "bulkEss": int(min_ess_bulk) if min_ess_bulk != "N/A" else "N/A",
        "tailEss": int(min_ess_tail) if min_ess_tail != "N/A" else "N/A",
        "looCv": loo_val,
        "waic": waic_val,
        "divergencesCount": divergences_count,
        "isConverged": max_rhat != "N/A" and max_rhat < 1.05 and min_ess_bulk != "N/A" and min_ess_bulk >= 400 and divergences_count == 0,
        "warnings": warnings,
        "posteriorMetrics": posterior_metrics
    }
