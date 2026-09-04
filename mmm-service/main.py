from __future__ import annotations

import datetime as dt
import logging
import math
import uuid
import warnings
from typing import Any

import numpy as np
import pandas as pd
import xarray as xr
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MERIDIAN_IMPORT_ERROR: str | None = None

try:
    import meridian
    import tensorflow_probability as tfp
    from meridian import constants
    from meridian.analysis.analyzer import Analyzer
    from meridian.data.data_frame_input_data_builder import (
        DataFrameInputDataBuilder,
    )
    from meridian.model import prior_distribution
    from meridian.model.model import Meridian
    from meridian.model.spec import ModelSpec

    MERIDIAN_AVAILABLE = True
    MERIDIAN_VERSION = meridian.__version__
except Exception as exc:  # pragma: no cover - exercised through availability flag
    MERIDIAN_AVAILABLE = False
    MERIDIAN_VERSION = None
    MERIDIAN_IMPORT_ERROR = str(exc)


app = FastAPI(title="Google Meridian Microservice")
logger = logging.getLogger("uvicorn")

_MODELS_DB: dict[str, Any] = {}
_ANALYZERS_DB: dict[str, Any] = {}

CONFIDENCE_LEVEL = 0.95
RESPONSE_CURVE_MULTIPLIERS = [0.0, 0.5, 1.0, 1.5, 2.0]


class MediaChannelConfig(BaseModel):
    channelName: str = Field(min_length=1)
    spendColumn: str = Field(min_length=1)
    impressionsColumn: str | None = None
    channelType: str | None = None


class MeridianConfig(BaseModel):
    dateColumn: str = Field(min_length=1)
    kpiColumn: str = Field(min_length=1)
    targetKpiType: str = "revenue"
    mediaChannels: list[MediaChannelConfig] = Field(min_length=1)
    controlColumns: list[str] = Field(default_factory=list)
    mcmcChains: int = Field(default=2, ge=2)
    mcmcDraws: int = Field(default=100, ge=1)
    mcmcWarmup: int = Field(default=100, ge=1)
    priors: dict[str, Any] | None = None
    maxLag: int | None = Field(default=None, ge=0)
    knots: int | None = Field(default=None, ge=1)
    randomSeed: int | None = None


class FitRequest(BaseModel):
    rows: list[dict[str, Any]] = Field(min_length=1)
    config: MeridianConfig


def _error(status_code: int, code: str, message: str, stage: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message, "stage": stage},
    )


@app.get("/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "healthy" if MERIDIAN_AVAILABLE else "unavailable",
        "meridian_available": MERIDIAN_AVAILABLE,
        "engine": "google-meridian",
        "version": MERIDIAN_VERSION,
        "import_error": MERIDIAN_IMPORT_ERROR,
    }


def to_json_compatible(value: Any) -> Any:
    """Converts scientific Python values to strict JSON-compatible values."""
    if value is None or isinstance(value, (str, bool)):
        return value
    if isinstance(value, (dt.datetime, dt.date, pd.Timestamp, np.datetime64)):
        return pd.Timestamp(value).isoformat()
    if isinstance(value, np.bool_):
        return bool(value)
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, (float, np.floating)):
        result = float(value)
        return result if math.isfinite(result) else None
    if isinstance(value, int):
        return value
    if isinstance(value, xr.Dataset):
        return to_json_compatible(value.to_dict(data=True))
    if isinstance(value, xr.DataArray):
        return to_json_compatible(value.to_dict())
    if isinstance(value, pd.DataFrame):
        return to_json_compatible(value.to_dict(orient="records"))
    if isinstance(value, pd.Series):
        return to_json_compatible(value.to_dict())
    if isinstance(value, np.ndarray):
        return to_json_compatible(value.tolist())
    if hasattr(value, "numpy"):
        return to_json_compatible(value.numpy())
    if isinstance(value, dict):
        return {str(key): to_json_compatible(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_json_compatible(item) for item in value]
    return str(value)


def _finite_float(value: Any) -> float | None:
    converted = to_json_compatible(value)
    if isinstance(converted, bool) or not isinstance(converted, (int, float)):
        return None
    result = float(converted)
    return result if math.isfinite(result) else None


def _select_scalar(data: xr.Dataset, variable: str, **selectors: Any) -> float | None:
    if variable not in data.data_vars:
        return None
    array = data[variable]
    for dimension, coordinate in selectors.items():
        if dimension in array.dims:
            try:
                array = array.sel({dimension: coordinate})
            except (KeyError, ValueError):
                return None
    values = np.asarray(array.values)
    if values.size != 1:
        return None
    return _finite_float(values.reshape(-1)[0])


def _posterior_stats(
    summary: xr.Dataset, variable: str, channel: str
) -> dict[str, float | None]:
    base = {"channel": channel, "distribution": "posterior"}
    return {
        "mean": _select_scalar(summary, variable, metric="mean", **base),
        "median": _select_scalar(summary, variable, metric="median", **base),
        "ciLow": _select_scalar(summary, variable, metric="ci_lo", **base),
        "ciHigh": _select_scalar(summary, variable, metric="ci_hi", **base),
    }


def _normalise_kpi_type(raw_type: str) -> str:
    value = raw_type.strip().lower().replace("-", "_")
    if value == "revenue":
        return constants.REVENUE
    if value in {"non_revenue", "conversions", "conversion", "sales", "units"}:
        return constants.NON_REVENUE
    raise ValueError(
        "targetKpiType must be 'revenue' or a supported non-revenue KPI type"
    )


def _coerce_numeric_column(df: pd.DataFrame, column: str) -> None:
    converted = pd.to_numeric(df[column], errors="coerce")
    if converted.isna().any() or not np.isfinite(converted.to_numpy()).all():
        raise ValueError(f"Column '{column}' must contain only finite numeric values")
    df[column] = converted.astype(float)


def _prepare_dataframe(req: FitRequest) -> tuple[pd.DataFrame, str]:
    df = pd.DataFrame(req.rows)
    config = req.config

    required_columns = {config.dateColumn, config.kpiColumn, *config.controlColumns}
    channel_names: set[str] = set()
    for channel in config.mediaChannels:
        if channel.channelName in channel_names:
            raise ValueError(f"Duplicate media channel name: '{channel.channelName}'")
        channel_names.add(channel.channelName)
        required_columns.add(channel.spendColumn)
        if not channel.impressionsColumn:
            raise ValueError(
                f"Exposure column is required for media channel '{channel.channelName}'; "
                "spend is not accepted as exposure"
            )
        required_columns.add(channel.impressionsColumn)

    missing_columns = sorted(required_columns.difference(df.columns))
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    parsed_time = pd.to_datetime(df[config.dateColumn], errors="coerce")
    if parsed_time.isna().any():
        raise ValueError(f"Column '{config.dateColumn}' contains invalid dates")
    if parsed_time.duplicated().any():
        raise ValueError(f"Column '{config.dateColumn}' contains duplicate dates")
    df[config.dateColumn] = parsed_time
    df = df.sort_values(config.dateColumn).reset_index(drop=True)

    numeric_columns = {config.kpiColumn, *config.controlColumns}
    for channel in config.mediaChannels:
        numeric_columns.add(channel.spendColumn)
        numeric_columns.add(channel.impressionsColumn)  # type: ignore[arg-type]
    for column in numeric_columns:
        _coerce_numeric_column(df, column)

    for channel in config.mediaChannels:
        exposure_column = channel.impressionsColumn
        assert exposure_column is not None
        if (df[channel.spendColumn] < 0).any():
            raise ValueError(f"Spend column '{channel.spendColumn}' cannot be negative")
        if (df[exposure_column] < 0).any():
            raise ValueError(f"Exposure column '{exposure_column}' cannot be negative")
        if float(df[channel.spendColumn].sum()) <= 0:
            raise ValueError(f"Spend column '{channel.spendColumn}' must have positive total spend")
        if float(df[exposure_column].sum()) <= 0:
            raise ValueError(f"Exposure column '{exposure_column}' must have positive total exposure")

    return df, _normalise_kpi_type(config.targetKpiType)


def _build_input_data(df: pd.DataFrame, config: MeridianConfig, kpi_type: str) -> Any:
    builder = DataFrameInputDataBuilder(
        kpi_type=kpi_type,
        default_time_column=config.dateColumn,
        default_kpi_column=config.kpiColumn,
    )
    builder.with_kpi(
        df,
        kpi_col=config.kpiColumn,
        time_col=config.dateColumn,
    )
    builder.with_media(
        df,
        media_cols=[channel.impressionsColumn for channel in config.mediaChannels],
        media_spend_cols=[channel.spendColumn for channel in config.mediaChannels],
        media_channels=[channel.channelName for channel in config.mediaChannels],
        time_col=config.dateColumn,
    )
    if config.controlColumns:
        builder.with_controls(
            df,
            control_cols=config.controlColumns,
            time_col=config.dateColumn,
        )
    return builder.build()


def _prior_mean_std(priors: dict[str, Any], key: str) -> tuple[float, float] | None:
    value = priors.get(key)
    if value is None:
        return None
    if not isinstance(value, dict) or "mean" not in value or "std" not in value:
        raise ValueError(f"Prior '{key}' requires numeric 'mean' and 'std' values")
    mean = float(value["mean"])
    std = float(value["std"])
    if not math.isfinite(mean) or not math.isfinite(std) or std < 0:
        raise ValueError(f"Prior '{key}' has invalid mean/std values")
    return mean, std


def _build_prior(priors: dict[str, Any] | None) -> Any | None:
    if not priors:
        return None

    supported = {
        "adstockAlphaPrior",
        "hillHalfSaturationPrior",
        "hillSlopePrior",
    }
    unsupported = sorted(set(priors).difference(supported))
    if unsupported:
        raise NotImplementedError(
            f"Unsupported Meridian prior configuration: {', '.join(unsupported)}"
        )

    kwargs: dict[str, Any] = {}
    alpha = _prior_mean_std(priors, "adstockAlphaPrior")
    if alpha is not None:
        mean, std = alpha
        variance = std**2
        if not 0 < mean < 1 or variance <= 0 or variance >= mean * (1 - mean):
            raise ValueError(
                "adstockAlphaPrior must satisfy 0 < mean < 1 and "
                "0 < std^2 < mean * (1 - mean)"
            )
        concentration = mean * (1 - mean) / variance - 1
        kwargs["alpha_m"] = tfp.distributions.Beta(
            concentration1=mean * concentration,
            concentration0=(1 - mean) * concentration,
            name=constants.ALPHA_M,
        )

    half_saturation = _prior_mean_std(priors, "hillHalfSaturationPrior")
    if half_saturation is not None:
        mean, std = half_saturation
        if mean <= 0:
            raise ValueError("hillHalfSaturationPrior mean must be positive")
        kwargs["ec_m"] = prior_distribution.lognormal_dist_from_mean_std(mean, std)

    slope = _prior_mean_std(priors, "hillSlopePrior")
    if slope is not None:
        mean, std = slope
        if mean <= 0:
            raise ValueError("hillSlopePrior mean must be positive")
        kwargs["slope_m"] = prior_distribution.lognormal_dist_from_mean_std(mean, std)

    return prior_distribution.PriorDistribution(**kwargs)


def _build_model(input_data_value: Any, config: MeridianConfig) -> Any:
    prior = _build_prior(config.priors)
    spec_kwargs: dict[str, Any] = {}
    if prior is not None:
        spec_kwargs["prior"] = prior
    if config.maxLag is not None:
        spec_kwargs["max_lag"] = config.maxLag
    if config.knots is not None:
        spec_kwargs["knots"] = config.knots
    model_spec = ModelSpec(**spec_kwargs)
    return Meridian(input_data=input_data_value, model_spec=model_spec)


def _sample_model(model: Any, config: MeridianConfig) -> None:
    model.sample_prior(n_draws=config.mcmcDraws, seed=config.randomSeed)
    model.sample_posterior(
        n_chains=config.mcmcChains,
        n_adapt=config.mcmcWarmup,
        n_burnin=config.mcmcWarmup,
        n_keep=config.mcmcDraws,
        seed=config.randomSeed,
    )


def _accuracy_value(accuracy: xr.Dataset, metric: str) -> float | None:
    selectors: dict[str, Any] = {
        "metric": metric,
        "geo_granularity": constants.NATIONAL,
    }
    if constants.EVALUATION_SET in accuracy["value"].dims:
        selectors[constants.EVALUATION_SET] = constants.ALL_DATA
    return _select_scalar(accuracy, "value", **selectors)


def _interval(stats: dict[str, float | None]) -> dict[str, float | None]:
    return {
        "ci025": stats["ciLow"],
        "ci050": stats["median"],
        "ci975": stats["ciHigh"],
    }


def _build_channels(
    summary: xr.Dataset, config: MeridianConfig
) -> list[dict[str, Any]]:
    channels: list[dict[str, Any]] = []
    for channel_config in config.mediaChannels:
        channel = channel_config.channelName
        incremental = _posterior_stats(summary, constants.INCREMENTAL_OUTCOME, channel)
        contribution = _posterior_stats(summary, constants.PCT_OF_CONTRIBUTION, channel)
        roi = _posterior_stats(summary, constants.ROI, channel)
        mroi = _posterior_stats(summary, constants.MROI, channel)
        effectiveness = _posterior_stats(summary, constants.EFFECTIVENESS, channel)
        channels.append(
            {
                "channelName": channel,
                "spend": _select_scalar(summary, constants.SPEND, channel=channel),
                "spendShare": _select_scalar(
                    summary, constants.PCT_OF_SPEND, channel=channel
                ),
                "exposure": _select_scalar(
                    summary, constants.IMPRESSIONS, channel=channel
                ),
                "incrementalOutcome": incremental["mean"],
                "incrementalKpi": incremental["mean"],
                "incrementalOutcomeInterval": _interval(incremental),
                "contribution": contribution["mean"],
                "contributionShare": contribution["mean"],
                "kpiShare": contribution["mean"],
                "contributionInterval": _interval(contribution),
                "roi": roi["mean"],
                "roiInterval": _interval(roi),
                "marginalRoi": mroi["mean"],
                "marginalRoiInterval": _interval(mroi),
                "effectiveness": effectiveness["mean"],
                "effectivenessInterval": _interval(effectiveness),
                "cpm": _select_scalar(summary, constants.CPM, channel=channel),
                "costPerIncrementalKpi": _posterior_stats(
                    summary, constants.CPIK, channel
                )["mean"],
            }
        )
    return channels


def _curve_points(
    curves: xr.Dataset, channel: str
) -> list[dict[str, float | None]]:
    multipliers = [float(value) for value in curves.coords[constants.SPEND_MULTIPLIER].values]
    spends = [
        _select_scalar(
            curves,
            constants.SPEND,
            channel=channel,
            spend_multiplier=multiplier,
        )
        for multiplier in multipliers
    ]
    means = [
        _select_scalar(
            curves,
            constants.INCREMENTAL_OUTCOME,
            channel=channel,
            spend_multiplier=multiplier,
            metric=constants.MEAN,
        )
        for multiplier in multipliers
    ]

    def marginal_roi(index: int) -> float | None:
        if len(multipliers) < 2:
            return None
        left = max(0, index - 1)
        right = min(len(multipliers) - 1, index + 1)
        if left == right:
            return None
        if None in {spends[left], spends[right], means[left], means[right]}:
            return None
        spend_delta = float(spends[right]) - float(spends[left])
        if spend_delta == 0:
            return None
        return (float(means[right]) - float(means[left])) / spend_delta

    points: list[dict[str, float | None]] = []
    for index, multiplier in enumerate(multipliers):
        spend = spends[index]
        mean = means[index]
        roi = None if spend in (None, 0) or mean is None else mean / spend
        points.append(
            {
                "spendMultiplier": multiplier,
                "spend": spend,
                "incrementalOutcome": mean,
                "incrementalKpi": mean,
                "incrementalKpiLower": _select_scalar(
                    curves,
                    constants.INCREMENTAL_OUTCOME,
                    channel=channel,
                    spend_multiplier=multiplier,
                    metric=constants.CI_LO,
                ),
                "incrementalKpiUpper": _select_scalar(
                    curves,
                    constants.INCREMENTAL_OUTCOME,
                    channel=channel,
                    spend_multiplier=multiplier,
                    metric=constants.CI_HI,
                ),
                "roi": roi,
                "marginalRoi": marginal_roi(index),
            }
        )
    return points


def _build_results(
    model: Any,
    input_data_value: Any,
    df: pd.DataFrame,
    config: MeridianConfig,
    kpi_type: str,
) -> tuple[Any, dict[str, Any]]:
    analysis = Analyzer(
        model_context=model.model_context,
        inference_data=model.inference_data,
    )
    use_kpi = kpi_type == constants.NON_REVENUE
    batch_size = min(config.mcmcDraws, 100)
    summary = analysis.summary_metrics(
        use_kpi=use_kpi,
        confidence_level=CONFIDENCE_LEVEL,
        batch_size=batch_size,
    )
    accuracy = analysis.predictive_accuracy(
        use_kpi=use_kpi,
        batch_size=batch_size,
    )
    rhat_summary = analysis.rhat_summary()
    response_curves = analysis.response_curves(
        spend_multipliers=RESPONSE_CURVE_MULTIPLIERS,
        use_posterior=True,
        use_kpi=use_kpi,
        confidence_level=CONFIDENCE_LEVEL,
        batch_size=batch_size,
    )

    channels = _build_channels(summary, config)
    total_channel = constants.ALL_CHANNELS
    total_incremental = _posterior_stats(
        summary, constants.INCREMENTAL_OUTCOME, total_channel
    )["mean"]
    blended_roi = _posterior_stats(summary, constants.ROI, total_channel)["mean"]
    total_spend = _select_scalar(summary, constants.SPEND, channel=total_channel)
    if total_spend is None:
        total_spend = _finite_float(np.asarray(input_data_value.media_spend).sum())

    rhat_records = to_json_compatible(rhat_summary)
    rhat_candidates = [
        record.get(constants.MAX_RHAT)
        for record in rhat_records
        if isinstance(record, dict) and record.get(constants.MAX_RHAT) is not None
    ]
    max_rhat = max(rhat_candidates) if rhat_candidates else None

    r_squared = _accuracy_value(accuracy, constants.R_SQUARED)
    mape_fraction = _accuracy_value(accuracy, constants.MAPE)
    wmape_fraction = _accuracy_value(accuracy, constants.WMAPE)
    diagnostics = {
        "r2": r_squared,
        "rSquared": r_squared,
        "mape": None if mape_fraction is None else mape_fraction * 100,
        "wmape": None if wmape_fraction is None else wmape_fraction * 100,
        "gelmanRubinRhat": max_rhat,
        "rhat": max_rhat,
        "isConverged": None if max_rhat is None else max_rhat < 1.2,
        "metricUnits": {"rSquared": "ratio", "mape": "percent", "wmape": "percent"},
        "predictiveAccuracy": to_json_compatible(accuracy),
        "rhatSummary": rhat_records,
    }

    response_curve_dto = {
        channel.channelName: {
            "channelName": channel.channelName,
            "currentSpend": _select_scalar(
                summary, constants.SPEND, channel=channel.channelName
            ),
            "points": _curve_points(response_curves, channel.channelName),
        }
        for channel in config.mediaChannels
    }

    results = {
        "totalSpend": total_spend,
        "totalKpi": _finite_float(df[config.kpiColumn].sum()),
        "totalIncrementalOutcome": total_incremental,
        "blendedRoi": blended_roi,
        "channels": channels,
        "diagnostics": diagnostics,
        "responseCurves": response_curve_dto,
    }
    return analysis, to_json_compatible(results)


@app.post("/api/v1/meridian/fit")
def fit_model(req: FitRequest) -> dict[str, Any]:
    if not MERIDIAN_AVAILABLE:
        raise _error(
            503,
            "MERIDIAN_UNAVAILABLE",
            MERIDIAN_IMPORT_ERROR or "google-meridian is not installed",
            "availability",
        )

    try:
        df, kpi_type = _prepare_dataframe(req)
        input_data_value = _build_input_data(df, req.config, kpi_type)
    except HTTPException:
        raise
    except Exception as exc:
        raise _error(422, "INVALID_MERIDIAN_INPUT", str(exc), "input_data") from exc

    try:
        model = _build_model(input_data_value, req.config)
    except NotImplementedError as exc:
        raise _error(501, "NOT_IMPLEMENTED", str(exc), "model_spec") from exc
    except Exception as exc:
        raise _error(422, "MODEL_SPEC_FAILED", str(exc), "model_spec") from exc

    captured_warnings: list[warnings.WarningMessage]
    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            _sample_model(model, req.config)
        captured_warnings = list(caught)
    except Exception as exc:
        logger.exception("Meridian posterior sampling failed")
        raise _error(500, "MCMC_EXECUTION_FAILED", str(exc), "posterior") from exc

    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            analysis, results = _build_results(
                model,
                input_data_value,
                df,
                req.config,
                kpi_type,
            )
        captured_warnings.extend(caught)
    except Exception as exc:
        logger.exception("Meridian analysis failed")
        raise _error(500, "ANALYSIS_FAILED", str(exc), "analyzer") from exc

    model_id = str(uuid.uuid4())
    _MODELS_DB[model_id] = model
    _ANALYZERS_DB[model_id] = analysis

    warning_messages = list(dict.fromkeys(str(item.message) for item in captured_warnings))
    return {
        "status": "success",
        "modelId": model_id,
        "engine": "google-meridian",
        "engineVersion": MERIDIAN_VERSION,
        "results": results,
        "warnings": warning_messages,
    }


@app.post("/api/v1/meridian/optimize")
def optimize_budget() -> None:
    raise _error(
        501,
        "NOT_IMPLEMENTED",
        "Budget Optimizer is not implemented in this service",
        "optimizer",
    )


@app.post("/api/v1/meridian/simulate")
def simulate_scenario() -> None:
    raise _error(
        501,
        "NOT_IMPLEMENTED",
        "What-If simulation is not implemented in this service",
        "simulation",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8008)
