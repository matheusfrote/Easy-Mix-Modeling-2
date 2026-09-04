from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import xarray as xr
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main  # noqa: E402


def controlled_payload() -> dict:
    rng = np.random.default_rng(20260903)
    periods = 32
    time = pd.date_range("2024-01-01", periods=periods, freq="W-MON")
    trend = np.linspace(0, 1, periods)
    seasonality = np.sin(np.linspace(0, 4 * np.pi, periods))
    tv_exposure = 45_000 + 9_000 * (1 + seasonality) + rng.normal(0, 2_000, periods)
    search_exposure = 2_300 + 650 * (1 + np.cos(np.linspace(0, 5 * np.pi, periods))) + rng.normal(0, 120, periods)
    tv_spend = 7_000 + tv_exposure * 0.035 + rng.normal(0, 180, periods)
    search_spend = 4_000 + search_exposure * 0.8 + rng.normal(0, 100, periods)
    revenue = (
        45_000
        + 0.16 * tv_exposure
        + 3.2 * search_exposure
        + 1_700 * seasonality
        + 4_000 * trend
        + rng.normal(0, 700, periods)
    )

    rows = []
    for index in range(periods):
        rows.append(
            {
                "week": time[index].strftime("%Y-%m-%d"),
                "revenue": float(revenue[index]),
                "tv_impressions": float(tv_exposure[index]),
                "tv_spend": float(tv_spend[index]),
                "search_clicks": float(search_exposure[index]),
                "search_spend": float(search_spend[index]),
                "seasonality": float(seasonality[index]),
            }
        )

    return {
        "rows": rows,
        "config": {
            "dateColumn": "week",
            "kpiColumn": "revenue",
            "targetKpiType": "revenue",
            "mediaChannels": [
                {
                    "channelName": "TV",
                    "spendColumn": "tv_spend",
                    "impressionsColumn": "tv_impressions",
                },
                {
                    "channelName": "Search",
                    "spendColumn": "search_spend",
                    "impressionsColumn": "search_clicks",
                },
            ],
            "controlColumns": ["seasonality"],
            "mcmcChains": 2,
            "mcmcDraws": 10,
            "mcmcWarmup": 10,
            "maxLag": 2,
            "knots": 4,
            "randomSeed": 7,
            "priors": {},
        },
    }


@pytest.fixture(scope="session")
def completed_fit() -> dict:
    assert main.MERIDIAN_AVAILABLE, main.MERIDIAN_IMPORT_ERROR
    response = TestClient(main.app).post(
        "/api/v1/meridian/fit", json=controlled_payload()
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "success"
    return data


def test_real_version_is_exposed() -> None:
    assert main.MERIDIAN_VERSION == "1.8.0"
    assert main.MERIDIAN_VERSION == main.meridian.__version__


def test_input_builder_keeps_exposure_and_spend_separate() -> None:
    request = main.FitRequest.model_validate(controlled_payload())
    frame, kpi_type = main._prepare_dataframe(request)
    input_data = main._build_input_data(frame, request.config, kpi_type)

    np.testing.assert_allclose(
        np.asarray(input_data.media)[0, :, 0], frame["tv_impressions"].to_numpy()
    )
    np.testing.assert_allclose(
        np.asarray(input_data.media_spend)[0, :, 0], frame["tv_spend"].to_numpy()
    )
    assert not np.array_equal(
        np.asarray(input_data.media)[0, :, 0],
        np.asarray(input_data.media_spend)[0, :, 0],
    )


def test_ui_prior_configuration_builds_an_official_model_spec() -> None:
    payload = controlled_payload()
    payload["config"]["priors"] = {
        "adstockAlphaPrior": {"mean": 0.5, "std": 0.2},
        "hillHalfSaturationPrior": {"mean": 0.5, "std": 0.2},
        "hillSlopePrior": {"mean": 1.5, "std": 0.5},
    }
    request = main.FitRequest.model_validate(payload)
    frame, kpi_type = main._prepare_dataframe(request)
    input_data = main._build_input_data(frame, request.config, kpi_type)

    model = main._build_model(input_data, request.config)

    assert model.model_spec.prior.alpha_m is not None
    assert model.model_spec.prior.ec_m is not None
    assert model.model_spec.prior.slope_m is not None


def test_missing_exposure_is_validation_error() -> None:
    payload = controlled_payload()
    del payload["config"]["mediaChannels"][0]["impressionsColumn"]
    response = TestClient(main.app).post("/api/v1/meridian/fit", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_MERIDIAN_INPUT"


def test_unavailable_meridian_returns_503(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "MERIDIAN_AVAILABLE", False)
    monkeypatch.setattr(main, "MERIDIAN_IMPORT_ERROR", "controlled import failure")
    response = TestClient(main.app).post(
        "/api/v1/meridian/fit", json=controlled_payload()
    )
    assert response.status_code == 503
    assert response.json()["detail"] == {
        "code": "MERIDIAN_UNAVAILABLE",
        "message": "controlled import failure",
        "stage": "availability",
    }


def test_posterior_failure_never_returns_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "_build_input_data", lambda *_args: object())
    monkeypatch.setattr(main, "_build_model", lambda *_args: object())

    def fail_sampling(*_args) -> None:
        raise RuntimeError("controlled posterior failure")

    monkeypatch.setattr(main, "_sample_model", fail_sampling)
    response = TestClient(main.app).post(
        "/api/v1/meridian/fit", json=controlled_payload()
    )
    assert response.status_code == 500
    assert response.json()["detail"]["code"] == "MCMC_EXECUTION_FAILED"
    assert response.json().get("status") != "success"


def test_analyzer_failure_never_returns_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "_build_input_data", lambda *_args: object())
    monkeypatch.setattr(main, "_build_model", lambda *_args: object())
    monkeypatch.setattr(main, "_sample_model", lambda *_args: None)

    def fail_analyzer(*_args) -> None:
        raise RuntimeError("controlled analyzer failure")

    monkeypatch.setattr(main, "_build_results", fail_analyzer)
    response = TestClient(main.app).post(
        "/api/v1/meridian/fit", json=controlled_payload()
    )
    assert response.status_code == 500
    assert response.json()["detail"]["code"] == "ANALYSIS_FAILED"
    assert response.json().get("status") != "success"


def test_scientific_values_are_strict_json() -> None:
    value = {
        "array": np.array([1.0, np.nan]),
        "frame": pd.DataFrame({"value": [np.float64(2.0)]}),
        "dataset": xr.Dataset({"metric": ("channel", [np.float64(3.0)])}),
    }
    converted = main.to_json_compatible(value)
    assert converted["array"] == [1.0, None]
    assert converted["frame"] == [{"value": 2.0}]
    assert converted["dataset"]["data_vars"]["metric"]["data"] == [3.0]
    json.dumps(converted, allow_nan=False)


def test_unknown_model_id_is_not_reconstructed_from_frontend() -> None:
    client = TestClient(main.app)
    optimizer = client.post(
        "/api/v1/meridian/optimize",
        json={"modelId": "unknown", "targetTotalBudget": 100},
    )
    scenario = client.post(
        "/api/v1/meridian/simulate",
        json={"modelId": "unknown", "channelSpends": {"TV": 100}},
    )
    assert optimizer.status_code == 404
    assert optimizer.json()["detail"]["code"] == "MODEL_NOT_FOUND"
    assert scenario.status_code == 404
    assert scenario.json()["detail"]["code"] == "MODEL_NOT_FOUND"


def test_full_pipeline_returns_real_analyzer_outputs(completed_fit: dict) -> None:
    assert completed_fit["engine"] == "google-meridian"
    assert completed_fit["engineVersion"] == "1.8.0"
    assert completed_fit["modelId"]

    results = completed_fit["results"]
    assert results["totalSpend"] > 0
    assert results["totalKpi"] > 0
    assert results["blendedRoi"] is not None
    assert {channel["channelName"] for channel in results["channels"]} == {
        "TV",
        "Search",
    }
    for channel in results["channels"]:
        assert channel["spend"] > 0
        assert channel["exposure"] > 0
        assert channel["roi"] is not None
        assert channel["marginalRoi"] is not None
        assert channel["incrementalOutcome"] is not None
        assert channel["contribution"] is not None
        assert channel["saturationLevel"] is not None
        assert channel["adstockDecay"] is not None
        assert all(
            channel["roiInterval"][key] is not None
            for key in ("ci025", "ci050", "ci975")
        )

    diagnostics = results["diagnostics"]
    assert diagnostics["rSquared"] is not None
    assert diagnostics["mape"] is not None
    assert diagnostics["wmape"] is not None
    assert diagnostics["gelmanRubinRhat"] is not None
    assert diagnostics["predictiveAccuracy"]["data_vars"]
    assert diagnostics["rhatSummary"]

    assert set(results["responseCurves"]) == {"TV", "Search"}
    for curve in results["responseCurves"].values():
        assert len(curve["points"]) == len(main.RESPONSE_CURVE_MULTIPLIERS)
        for point in curve["points"]:
            assert point["spend"] is not None
            assert point["incrementalOutcome"] is not None
            assert point["incrementalKpiLower"] is not None
            assert point["incrementalKpiUpper"] is not None
            assert point["roi"] is None
            assert point["marginalRoi"] is None

    def assert_finite_or_null(value) -> None:
        if isinstance(value, dict):
            for item in value.values():
                assert_finite_or_null(item)
        elif isinstance(value, list):
            for item in value:
                assert_finite_or_null(item)
        elif isinstance(value, float):
            assert math.isfinite(value)

    assert_finite_or_null(completed_fit)


def test_real_model_optimizer_decision_inputs(completed_fit: dict) -> None:
    client = TestClient(main.app)
    response = client.post(
        "/api/v1/meridian/optimize",
        json={
            "modelId": completed_fit["modelId"],
            "targetTotalBudget": completed_fit["results"]["totalSpend"],
            "decisionEngineVersion": "1.1.0",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "success"
    assert data["modelId"] == completed_fit["modelId"]
    results = data["results"]
    assert results["modelId"] == completed_fit["modelId"]
    assert results["currentTotalBudget"] > 0
    assert results["targetTotalBudget"] > 0
    assert results["expectedCurrentKpi"] is not None
    assert results["expectedOptimizedKpi"] is not None
    assert results["incrementalKpi"] is not None
    assert {item["channelName"] for item in results["reallocations"]} == {
        "TV",
        "Search",
    }
    assert sum(
        item["recommendedSpendShare"] for item in results["reallocations"]
    ) == pytest.approx(100.0, rel=5e-4)
    for item in results["reallocations"]:
        assert item["currentSpend"] is not None
        assert item["recommendedSpend"] is not None
        assert item["currentRoi"] is not None
        assert item["optimizedRoi"] is not None
        assert item["marginalRoi"] is not None

    repeated = client.post(
        "/api/v1/meridian/optimize",
        json={
            "modelId": completed_fit["modelId"],
            "targetTotalBudget": completed_fit["results"]["totalSpend"],
            "decisionEngineVersion": "1.1.0",
        },
    )
    assert repeated.status_code == 200
    assert repeated.json() == data


def test_optimizer_changes_with_a_distinct_budget(completed_fit: dict) -> None:
    target = completed_fit["results"]["totalSpend"] * 1.05
    response = TestClient(main.app).post(
        "/api/v1/meridian/optimize",
        json={
            "modelId": completed_fit["modelId"],
            "targetTotalBudget": target,
            "decisionEngineVersion": "1.1.0",
        },
    )
    assert response.status_code == 200, response.text
    results = response.json()["results"]
    assert results["targetTotalBudget"] == pytest.approx(target)
    recommended_total = sum(
        item["recommendedSpend"] for item in results["reallocations"]
    )
    # Meridian optimizes on a discrete spend grid, so the channel sum can differ
    # slightly from the continuous target while still representing that budget.
    assert recommended_total == pytest.approx(target, rel=5e-4)
    assert results["expectedOptimizedKpi"] is not None


def test_real_model_what_if_uses_posterior(completed_fit: dict) -> None:
    current_spends = {
        item["channelName"]: item["spend"]
        for item in completed_fit["results"]["channels"]
    }
    scenario_spends = dict(current_spends)
    scenario_spends["Search"] *= 1.1
    response = TestClient(main.app).post(
        "/api/v1/meridian/simulate",
        json={
            "modelId": completed_fit["modelId"],
            "channelSpends": scenario_spends,
            "decisionEngineVersion": "1.1.0",
        },
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "success"
    results = data["results"]
    assert results["modelId"] == completed_fit["modelId"]
    assert results["channelSpends"] == scenario_spends
    assert results["expectedKpi"] is not None
    assert results["expectedKpiLower"] is not None
    assert results["expectedKpiUpper"] is not None
    assert results["expectedKpiLower"] <= results["expectedKpi"] <= results["expectedKpiUpper"]
    assert results["incrementalKpi"] is not None
    assert results["blendedRoi"] is not None

    second_spends = dict(current_spends)
    second_spends["TV"] *= 0.9
    second_response = TestClient(main.app).post(
        "/api/v1/meridian/simulate",
        json={
            "modelId": completed_fit["modelId"],
            "channelSpends": second_spends,
            "decisionEngineVersion": "1.1.0",
        },
    )
    assert second_response.status_code == 200, second_response.text
    second = second_response.json()["results"]
    assert second["id"] != results["id"]
    assert second["channelSpends"] == second_spends
    assert second["expectedKpi"] is not None


def test_scenario_rejects_missing_channels(completed_fit: dict) -> None:
    response = TestClient(main.app).post(
        "/api/v1/meridian/simulate",
        json={
            "modelId": completed_fit["modelId"],
            "channelSpends": {"TV": 100},
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_SCENARIO_INPUT"
