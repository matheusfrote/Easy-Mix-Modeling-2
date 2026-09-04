from __future__ import annotations

import datetime as dt
import hashlib
import json
import logging
import math
import time
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
    from meridian.analysis.optimizer import BudgetOptimizer
    from meridian.analysis.tensors import DataTensors
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
_MODEL_RECORDS: dict[str, dict[str, Any]] = {}
_DERIVED_RESULTS_CACHE: dict[str, dict[str, Any]] = {}
_DERIVED_CACHE_TIMES: dict[str, float] = {}

CONFIDENCE_LEVEL = 0.95
RESPONSE_CURVE_MULTIPLIERS = [0.0, 0.5, 1.0, 1.5, 2.0]
DECISION_ENGINE_VERSION = "1.1.0"
MODEL_TTL_SECONDS = 24 * 60 * 60
MAX_MODEL_RECORDS = 20
MAX_DERIVED_RESULTS = 200


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


class OptimizerRequest(BaseModel):
    modelId: str = Field(min_length=1)
    targetTotalBudget: float = Field(gt=0)
    constraints: dict[str, dict[str, float]] = Field(default_factory=dict)
    decisionEngineVersion: str = DECISION_ENGINE_VERSION


class ScenarioRequest(BaseModel):
    modelId: str = Field(min_length=1)
    channelSpends: dict[str, float]
    decisionEngineVersion: str = DECISION_ENGINE_VERSION


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

    if (df[config.kpiColumn] < 0).any():
        raise ValueError(f"KPI column '{config.kpiColumn}' cannot be negative")

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
                "saturationLevel": None,
                "saturationInterval": {"ci025": None, "ci050": None, "ci975": None},
                "currentMediaUnits": None,
                "adstockDecay": None,
                "adstockDecayInterval": {"ci025": None, "ci050": None, "ci975": None},
                "adstockHalfLifeWeeks": None,
            }
        )
    return channels


def _official_curve_point(
    table: pd.DataFrame,
    channel: str,
    coordinate: str,
    target: float,
    *,
    require_exact: bool = False,
) -> dict[str, float | None]:
    required = {
        constants.CHANNEL,
        constants.DISTRIBUTION,
        coordinate,
        constants.MEAN,
        constants.CI_LO,
        constants.CI_HI,
    }
    if not required.issubset(table.columns):
        return {"mean": None, "median": None, "ciLow": None, "ciHigh": None}
    rows = table[
        (table[constants.CHANNEL].astype(str) == channel)
        & (table[constants.DISTRIBUTION] == constants.POSTERIOR)
    ].copy()
    rows[coordinate] = pd.to_numeric(rows[coordinate], errors="coerce")
    rows = rows[np.isfinite(rows[coordinate])]
    if rows.empty:
        return {"mean": None, "median": None, "ciLow": None, "ciHigh": None}
    distances = (rows[coordinate] - target).abs()
    index = distances.idxmin()
    if require_exact and not math.isclose(
        float(rows.loc[index, coordinate]), target, abs_tol=1e-9
    ):
        return {"mean": None, "median": None, "ciLow": None, "ciHigh": None}
    row = rows.loc[index]
    return {
        "mean": _finite_float(row[constants.MEAN]),
        "median": None,
        "ciLow": _finite_float(row[constants.CI_LO]),
        "ciHigh": _finite_float(row[constants.CI_HI]),
    }


def _add_official_curve_features(
    channels: list[dict[str, Any]],
    input_data_value: Any,
    hill_curves: pd.DataFrame,
    adstock_decay: pd.DataFrame,
) -> None:
    media = np.asarray(input_data_value.media, dtype=float)
    if media.ndim < 1 or media.shape[-1] != len(channels):
        raise ValueError("Meridian media tensor does not match configured channels")
    observation_axes = tuple(range(media.ndim - 1))
    typical_media_units = np.nanmedian(media, axis=observation_axes)

    for index, channel in enumerate(channels):
        units = _finite_float(typical_media_units[index])
        saturation = (
            {"mean": None, "median": None, "ciLow": None, "ciHigh": None}
            if units is None
            else _official_curve_point(
                hill_curves,
                channel["channelName"],
                constants.MEDIA_UNITS,
                units,
            )
        )
        decay = _official_curve_point(
            adstock_decay,
            channel["channelName"],
            constants.TIME_UNITS,
            1.0,
            require_exact=True,
        )
        channel["currentMediaUnits"] = units
        channel["saturationLevel"] = saturation["mean"]
        channel["saturationInterval"] = _interval(saturation)
        channel["adstockDecay"] = decay["mean"]
        channel["adstockDecayInterval"] = _interval(decay)


def _curve_points(
    curves: xr.Dataset, channel: str
) -> list[dict[str, float | None]]:
    multipliers = [float(value) for value in curves.coords[constants.SPEND_MULTIPLIER].values]
    points: list[dict[str, float | None]] = []
    for multiplier in multipliers:
        spend = _select_scalar(
            curves,
            constants.SPEND,
            channel=channel,
            spend_multiplier=multiplier,
        )
        mean = _select_scalar(
            curves,
            constants.INCREMENTAL_OUTCOME,
            channel=channel,
            spend_multiplier=multiplier,
            metric=constants.MEAN,
        )
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
                # Meridian 1.8.0 response_curves does not expose ROI or mROI.
                # Those metrics remain available from official Analyzer and
                # BudgetOptimizer outputs; never reconstruct them locally.
                "roi": None,
                "marginalRoi": None,
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
    hill_curves = analysis.hill_curves(confidence_level=CONFIDENCE_LEVEL)
    adstock_decay = analysis.adstock_decay(confidence_level=CONFIDENCE_LEVEL)

    channels = _build_channels(summary, config)
    _add_official_curve_features(
        channels,
        input_data_value,
        hill_curves,
        adstock_decay,
    )
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
        "kpiType": "revenue" if kpi_type == constants.REVENUE else "non_revenue",
        "totalIncrementalOutcome": total_incremental,
        "blendedRoi": blended_roi,
        "channels": channels,
        "diagnostics": diagnostics,
        "responseCurves": response_curve_dto,
    }
    return analysis, to_json_compatible(results)


def _cache_key(model_id: str, operation: str, payload: dict[str, Any]) -> str:
    canonical = json.dumps(
        to_json_compatible(payload), sort_keys=True, separators=(",", ":")
    )
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return f"{model_id}:{operation}:{digest}"


def _get_model_record(model_id: str) -> dict[str, Any]:
    _prune_runtime_cache()
    record = _MODEL_RECORDS.get(model_id)
    if record is None:
        raise _error(404, "MODEL_NOT_FOUND", "Unknown or expired modelId", "model")
    return record


def _prune_runtime_cache() -> None:
    now = time.time()
    expired_models = [
        model_id
        for model_id, record in _MODEL_RECORDS.items()
        if now - float(record.get("created_at", now)) > MODEL_TTL_SECONDS
    ]
    while len(_MODEL_RECORDS) - len(expired_models) > MAX_MODEL_RECORDS:
        oldest = next(
            (model_id for model_id in _MODEL_RECORDS if model_id not in expired_models),
            None,
        )
        if oldest is None:
            break
        expired_models.append(oldest)
    for model_id in expired_models:
        _MODEL_RECORDS.pop(model_id, None)
        _MODELS_DB.pop(model_id, None)
        _ANALYZERS_DB.pop(model_id, None)
        prefix = f"{model_id}:"
        for cache_key in [key for key in _DERIVED_RESULTS_CACHE if key.startswith(prefix)]:
            _DERIVED_RESULTS_CACHE.pop(cache_key, None)
            _DERIVED_CACHE_TIMES.pop(cache_key, None)

    expired_derived = [
        key for key, created_at in _DERIVED_CACHE_TIMES.items()
        if now - created_at > MODEL_TTL_SECONDS
    ]
    for key in expired_derived:
        _DERIVED_RESULTS_CACHE.pop(key, None)
        _DERIVED_CACHE_TIMES.pop(key, None)
    while len(_DERIVED_RESULTS_CACHE) > MAX_DERIVED_RESULTS:
        oldest_key = next(iter(_DERIVED_RESULTS_CACHE))
        _DERIVED_RESULTS_CACHE.pop(oldest_key, None)
        _DERIVED_CACHE_TIMES.pop(oldest_key, None)


def _posterior_distribution_stats(value: Any) -> dict[str, float | None]:
    samples = np.asarray(to_json_compatible(value), dtype=float).reshape(-1)
    finite = samples[np.isfinite(samples)]
    if finite.size == 0:
        return {"mean": None, "ciLow": None, "ciHigh": None}
    return {
        "mean": _finite_float(np.mean(finite)),
        "ciLow": _finite_float(np.quantile(finite, (1 - CONFIDENCE_LEVEL) / 2)),
        "ciHigh": _finite_float(
            np.quantile(finite, 1 - (1 - CONFIDENCE_LEVEL) / 2)
        ),
    }


def _validated_channel_spends(
    record: dict[str, Any], raw_spends: dict[str, float]
) -> dict[str, float]:
    channel_names = [item.channelName for item in record["config"].mediaChannels]
    missing = sorted(set(channel_names).difference(raw_spends))
    unknown = sorted(set(raw_spends).difference(channel_names))
    if missing or unknown:
        details: list[str] = []
        if missing:
            details.append(f"missing channels: {', '.join(missing)}")
        if unknown:
            details.append(f"unknown channels: {', '.join(unknown)}")
        raise ValueError("channelSpends must match the fitted model (" + "; ".join(details) + ")")

    spends: dict[str, float] = {}
    for channel in channel_names:
        value = float(raw_spends[channel])
        if not math.isfinite(value) or value < 0:
            raise ValueError(f"Spend for '{channel}' must be a finite non-negative number")
        spends[channel] = value
    if sum(spends.values()) <= 0:
        raise ValueError("Scenario total spend must be positive")
    return spends


def _scenario_data_tensors(
    record: dict[str, Any], channel_spends: dict[str, float]
) -> Any:
    input_data_value = record["input_data"]
    channels = record["results"]["channels"]
    current_spends = np.asarray([item["spend"] for item in channels], dtype=float)
    requested_spends = np.asarray(
        [channel_spends[item["channelName"]] for item in channels], dtype=float
    )
    if np.any(~np.isfinite(current_spends)) or np.any(current_spends <= 0):
        raise ValueError("Fitted model has invalid historical channel spend")
    ratios = requested_spends / current_spends
    media = np.asarray(input_data_value.media) * ratios
    return DataTensors(media=media)


def _expected_outcome_stats(
    record: dict[str, Any], channel_spends: dict[str, float] | None = None
) -> dict[str, float | None]:
    new_data = (
        None
        if channel_spends is None
        else _scenario_data_tensors(record, channel_spends)
    )
    samples = record["analyzer"].expected_outcome(
        use_posterior=True,
        new_data=new_data,
        use_kpi=record["use_kpi"],
        batch_size=record["batch_size"],
    )
    return _posterior_distribution_stats(samples)


def _scenario_incremental_outcome(
    record: dict[str, Any], channel_spends: dict[str, float]
) -> float | None:
    samples = record["analyzer"].incremental_outcome(
        use_posterior=True,
        new_data=_scenario_data_tensors(record, channel_spends),
        use_kpi=record["use_kpi"],
        include_non_paid_channels=False,
        batch_size=record["batch_size"],
    )
    values = np.asarray(to_json_compatible(samples), dtype=float)
    if values.ndim < 1:
        return None
    return _finite_float(np.mean(np.sum(values, axis=-1)))


def _optimizer_constraints(
    req: OptimizerRequest, record: dict[str, Any]
) -> tuple[list[float] | None, list[float] | None]:
    if not req.constraints:
        return None, None

    channels = record["results"]["channels"]
    channel_names = [item["channelName"] for item in channels]
    unknown = sorted(set(req.constraints).difference(channel_names))
    if unknown:
        raise ValueError(f"Unknown constraint channels: {', '.join(unknown)}")

    total_spend = float(record["results"]["totalSpend"])
    if total_spend <= 0:
        raise ValueError("Fitted model has invalid total spend")
    lower: list[float] = []
    upper: list[float] = []
    for item in channels:
        channel = item["channelName"]
        center = req.targetTotalBudget * float(item["spend"]) / total_spend
        values = req.constraints.get(channel, {})
        minimum = float(values.get("minSpend", center * 0.7))
        maximum = float(values.get("maxSpend", center * 1.3))
        if not all(math.isfinite(value) for value in (minimum, maximum)):
            raise ValueError(f"Constraints for '{channel}' must be finite")
        if minimum < 0 or maximum < minimum:
            raise ValueError(f"Constraints for '{channel}' are invalid")
        lower_delta = 1 - minimum / center
        upper_delta = maximum / center - 1
        if not 0 <= lower_delta <= 1 or not 0 <= upper_delta <= 1:
            raise ValueError(
                f"Constraints for '{channel}' cannot be represented by Meridian's "
                "0-100% spend bounds around the target allocation"
            )
        lower.append(lower_delta)
        upper.append(upper_delta)
    return lower, upper


def _optimizer_result(req: OptimizerRequest, record: dict[str, Any]) -> dict[str, Any]:
    lower, upper = _optimizer_constraints(req, record)
    optimizer = BudgetOptimizer(record["model"])
    kwargs: dict[str, Any] = {
        "use_posterior": True,
        "fixed_budget": True,
        "budget": req.targetTotalBudget,
        "use_kpi": record["use_kpi"],
        "confidence_level": CONFIDENCE_LEVEL,
        "batch_size": record["batch_size"],
    }
    if lower is not None and upper is not None:
        kwargs["spend_constraint_lower"] = lower
        kwargs["spend_constraint_upper"] = upper
    optimization = optimizer.optimize(**kwargs)
    optimized_data = optimization.optimized_data
    channels = record["results"]["channels"]
    optimized_spends = {
        item["channelName"]: _select_scalar(
            optimized_data, constants.SPEND, channel=item["channelName"]
        )
        for item in channels
    }
    if any(value is None for value in optimized_spends.values()):
        raise RuntimeError("Meridian optimizer did not return channel spend")
    safe_optimized_spends = {
        channel: float(value) for channel, value in optimized_spends.items()
    }
    current_outcome = _expected_outcome_stats(record)
    optimized_outcome = _expected_outcome_stats(record, safe_optimized_spends)
    current_mean = current_outcome["mean"]
    optimized_mean = optimized_outcome["mean"]
    incremental = (
        None
        if current_mean is None or optimized_mean is None
        else optimized_mean - current_mean
    )
    lift = (
        None
        if incremental is None or current_mean in (None, 0)
        else incremental / current_mean * 100
    )

    reallocations: list[dict[str, Any]] = []
    marginal_graph: list[dict[str, Any]] = []
    for item in channels:
        channel = item["channelName"]
        current_spend = _finite_float(item["spend"])
        recommended_spend = safe_optimized_spends[channel]
        delta = (
            None if current_spend is None else recommended_spend - current_spend
        )
        delta_pct = (
            None
            if delta is None or current_spend == 0
            else delta / current_spend * 100
        )
        optimized_roi = _select_scalar(
            optimized_data, constants.ROI, channel=channel, metric=constants.MEAN
        )
        optimized_mroi = _select_scalar(
            optimized_data, constants.MROI, channel=channel, metric=constants.MEAN
        )
        optimized_incremental = _select_scalar(
            optimized_data,
            constants.INCREMENTAL_OUTCOME,
            channel=channel,
            metric=constants.MEAN,
        )
        current_incremental = _finite_float(item.get("incrementalOutcome"))
        reallocations.append(
            {
                "channelName": channel,
                "currentSpend": current_spend,
                "currentSpendShare": _finite_float(item.get("spendShare")),
                "recommendedSpend": recommended_spend,
                "recommendedSpendShare": recommended_spend / req.targetTotalBudget * 100,
                "deltaSpend": delta,
                "deltaPercentage": delta_pct,
                "percentageChange": delta_pct,
                "currentKpi": current_incremental,
                "projectedKpi": optimized_incremental,
                "deltaKpi": (
                    None
                    if current_incremental is None or optimized_incremental is None
                    else optimized_incremental - current_incremental
                ),
                "currentRoi": _finite_float(item.get("roi")),
                "optimizedRoi": optimized_roi,
                "projectedRoi": optimized_roi,
                "marginalRoi": optimized_mroi,
                "recommendationReason": None,
            }
        )
        marginal_graph.append(
            {
                "channelName": channel,
                "currentMroi": _finite_float(item.get("marginalRoi")),
                "optimizedMroi": optimized_mroi,
            }
        )

    return to_json_compatible(
        {
            "modelId": req.modelId,
            "engine": "google-meridian",
            "engineVersion": MERIDIAN_VERSION,
            "currentTotalBudget": record["results"]["totalSpend"],
            "targetTotalBudget": req.targetTotalBudget,
            "expectedCurrentKpi": current_mean,
            "expectedOptimizedKpi": optimized_mean,
            "incrementalKpi": incremental,
            "totalIncrementalKpi": incremental,
            "liftPercentage": lift,
            "overallLiftPercentage": lift,
            "blendedCurrentRoi": record["results"].get("blendedRoi"),
            "blendedProjectedRoi": _finite_float(
                optimized_data.attrs.get("total_roi")
            ),
            "reallocations": reallocations,
            "marginalEqualizationGraph": marginal_graph,
        }
    )


def _scenario_result(req: ScenarioRequest, record: dict[str, Any]) -> dict[str, Any]:
    spends = _validated_channel_spends(record, req.channelSpends)
    scenario = _expected_outcome_stats(record, spends)
    current = _expected_outcome_stats(record)
    expected = scenario["mean"]
    current_expected = current["mean"]
    incremental = (
        None
        if expected is None or current_expected is None
        else expected - current_expected
    )
    total_spend = sum(spends.values())
    media_incremental = _scenario_incremental_outcome(record, spends)
    blended_roi = (
        None if media_incremental is None or total_spend == 0 else media_incremental / total_spend
    )
    payload_hash = _cache_key(req.modelId, "scenario-id", {"channelSpends": spends})
    lift = (
        None
        if incremental is None or current_expected in (None, 0)
        else incremental / current_expected * 100
    )
    return to_json_compatible(
        {
            "id": "scenario-" + hashlib.sha256(payload_hash.encode()).hexdigest()[:16],
            "modelId": req.modelId,
            "engine": "google-meridian",
            "engineVersion": MERIDIAN_VERSION,
            "channelSpends": spends,
            "totalSpend": total_spend,
            "expectedKpi": expected,
            "expectedKpiLower": scenario["ciLow"],
            "expectedKpiUpper": scenario["ciHigh"],
            "incrementalKpi": incremental,
            "blendedRoi": blended_roi,
            "liftPercentage": lift,
            "projectedTotalKpi": expected,
            "projectedRoi": blended_roi,
        }
    )


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

    _prune_runtime_cache()
    model_id = str(uuid.uuid4())
    _MODELS_DB[model_id] = model
    _ANALYZERS_DB[model_id] = analysis
    _MODEL_RECORDS[model_id] = {
        "created_at": time.time(),
        "model": model,
        "analyzer": analysis,
        "input_data": input_data_value,
        "config": req.config,
        "kpi_type": kpi_type,
        "use_kpi": kpi_type == constants.NON_REVENUE,
        "batch_size": min(req.config.mcmcDraws, 100),
        "results": results,
    }

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
def optimize_budget(req: OptimizerRequest) -> dict[str, Any]:
    if not MERIDIAN_AVAILABLE:
        raise _error(
            503,
            "MERIDIAN_UNAVAILABLE",
            MERIDIAN_IMPORT_ERROR or "google-meridian is not installed",
            "availability",
        )
    record = _get_model_record(req.modelId)
    key = _cache_key(req.modelId, "optimizer", req.model_dump())
    if key not in _DERIVED_RESULTS_CACHE:
        try:
            _DERIVED_RESULTS_CACHE[key] = _optimizer_result(req, record)
            _DERIVED_CACHE_TIMES[key] = time.time()
            _prune_runtime_cache()
        except ValueError as exc:
            raise _error(422, "INVALID_OPTIMIZER_INPUT", str(exc), "optimizer") from exc
        except Exception as exc:
            logger.exception("Meridian budget optimization failed")
            raise _error(500, "OPTIMIZATION_FAILED", str(exc), "optimizer") from exc
    return {
        "status": "success",
        "modelId": req.modelId,
        "engine": "google-meridian",
        "engineVersion": MERIDIAN_VERSION,
        "results": _DERIVED_RESULTS_CACHE[key],
        "warnings": [],
    }


@app.post("/api/v1/meridian/simulate")
def simulate_scenario(req: ScenarioRequest) -> dict[str, Any]:
    if not MERIDIAN_AVAILABLE:
        raise _error(
            503,
            "MERIDIAN_UNAVAILABLE",
            MERIDIAN_IMPORT_ERROR or "google-meridian is not installed",
            "availability",
        )
    record = _get_model_record(req.modelId)
    key = _cache_key(req.modelId, "scenario", req.model_dump())
    if key not in _DERIVED_RESULTS_CACHE:
        try:
            _DERIVED_RESULTS_CACHE[key] = _scenario_result(req, record)
            _DERIVED_CACHE_TIMES[key] = time.time()
            _prune_runtime_cache()
        except ValueError as exc:
            raise _error(422, "INVALID_SCENARIO_INPUT", str(exc), "simulation") from exc
        except Exception as exc:
            logger.exception("Meridian scenario simulation failed")
            raise _error(500, "SIMULATION_FAILED", str(exc), "simulation") from exc
    return {
        "status": "success",
        "modelId": req.modelId,
        "engine": "google-meridian",
        "engineVersion": MERIDIAN_VERSION,
        "results": _DERIVED_RESULTS_CACHE[key],
        "warnings": [],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8008)
