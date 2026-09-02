#!/usr/bin/env python3
"""
Diagnostic Script: Meridian & Python Backend Dependency Compatibility
Verifies availability, imports, and version compatibility of the google-meridian
core libraries (jax, arviz, tensorflow, tensorflow-probability, numpy, etc.).
"""

import sys
import os
import json
import importlib
import platform
from typing import Dict, Any, List, Optional, Tuple

# Minimum version matrix for Google Meridian ecosystem
DEPENDENCY_SPECS: Dict[str, Dict[str, Any]] = {
    "tensorflow": {
        "import_name": "tensorflow",
        "min_version": "2.15.0",
        "critical": True,
        "description": "TensorFlow core framework for computational graphs and modeling"
    },
    "tensorflow_probability": {
        "import_name": "tensorflow_probability",
        "min_version": "0.23.0",
        "critical": True,
        "description": "Probabilistic reasoning and statistical distributions for Meridian"
    },
    "jax": {
        "import_name": "jax",
        "min_version": "0.4.20",
        "critical": False,
        "description": "JAX accelerator and differentiable computing library"
    },
    "jaxlib": {
        "import_name": "jaxlib",
        "min_version": "0.4.20",
        "critical": False,
        "description": "JAX C++ runtime library"
    },
    "arviz": {
        "import_name": "arviz",
        "min_version": "0.18.0",
        "critical": True,
        "description": "Exploratory analysis of Bayesian models (MCMC diagnostics, R-hat, ESS)"
    },
    "xarray": {
        "import_name": "xarray",
        "min_version": "2024.01.0",
        "critical": True,
        "description": "N-dimensional labeled arrays and dataset structures"
    },
    "numpy": {
        "import_name": "numpy",
        "min_version": "1.26.0",
        "critical": True,
        "description": "Fundamental scientific and matrix operations"
    },
    "scipy": {
        "import_name": "scipy",
        "min_version": "1.13.0",
        "critical": True,
        "description": "Scientific algorithms and statistical distributions"
    },
    "pandas": {
        "import_name": "pandas",
        "min_version": "2.2.0",
        "critical": True,
        "description": "Data manipulation, time-series, and tabular structures"
    },
    "flask": {
        "import_name": "flask",
        "min_version": "3.0.0",
        "critical": True,
        "description": "HTTP microservice server for Python MMM backend"
    },
    "flask_cors": {
        "import_name": "flask_cors",
        "min_version": "4.0.0",
        "critical": True,
        "description": "Cross-Origin Resource Sharing for local Vite dev server communication"
    },
    "google-meridian": {
        "import_name": "meridian",
        "alt_import_name": "google_meridian",
        "min_version": "0.1.0",
        "critical": True,
        "description": "Official Google Meridian Bayesian Marketing Mix Modeling framework"
    }
}


def parse_version_tuple(v_str: str) -> Tuple[int, ...]:
    """Parse version string into a comparable tuple of integers."""
    clean = "".join(c if c.isdigit() or c == "." else " " for c in v_str).strip()
    parts = []
    for chunk in clean.split("."):
        chunk = chunk.strip()
        if chunk.isdigit():
            parts.append(int(chunk))
        elif chunk:
            parts.append(0)
    return tuple(parts) if parts else (0,)


def compare_versions(installed: str, required: str) -> bool:
    """Return True if installed version is >= required minimum version."""
    v_inst = parse_version_tuple(installed)
    v_req = parse_version_tuple(required)
    
    # Pad shorter tuple with zeros
    max_len = max(len(v_inst), len(v_req))
    v_inst_padded = v_inst + (0,) * (max_len - len(v_inst))
    v_req_padded = v_req + (0,) * (max_len - len(v_req))
    
    return v_inst_padded >= v_req_padded


def probe_module(pkg_key: str, spec: Dict[str, Any]) -> Dict[str, Any]:
    """Probe whether module is importable and check version conformity."""
    import_name = spec["import_name"]
    alt_name = spec.get("alt_import_name")
    min_version = spec.get("min_version", "0.0.0")
    critical = spec.get("critical", False)
    desc = spec.get("description", "")

    result: Dict[str, Any] = {
        "package": pkg_key,
        "import_name": import_name,
        "description": desc,
        "critical": critical,
        "available": False,
        "version": None,
        "min_version": min_version,
        "version_ok": False,
        "status": "FAIL" if critical else "WARN",
        "error": None
    }

    mod = None
    try:
        mod = importlib.import_module(import_name)
    except ImportError as e:
        if alt_name:
            try:
                mod = importlib.import_module(alt_name)
            except ImportError:
                pass
        if mod is None:
            result["error"] = str(e)
            result["status"] = "FAIL" if critical else "WARN"
            return result
    except Exception as e:
        result["error"] = f"Runtime error during import: {str(e)}"
        result["status"] = "FAIL" if critical else "WARN"
        return result

    result["available"] = True
    raw_version = getattr(mod, "__version__", None) or getattr(mod, "VERSION", None)
    if raw_version is not None:
        version_str = str(raw_version)
        result["version"] = version_str
        is_ok = compare_versions(version_str, min_version)
        result["version_ok"] = is_ok
        if is_ok:
            result["status"] = "PASS"
        else:
            result["status"] = "WARN"
            result["error"] = f"Version mismatch: installed {version_str} < required {min_version}"
    else:
        result["version"] = "unknown"
        result["version_ok"] = True
        result["status"] = "PASS"

    return result


def probe_interoperability() -> List[Dict[str, Any]]:
    """Run deeper integration tests between packages (TF, TFP, JAX, ArviZ, Meridian)."""
    checks = []

    # 1. JAX backend & devices
    try:
        import jax
        devices = jax.devices()
        checks.append({
            "check": "JAX Backend & Devices",
            "status": "PASS",
            "message": f"JAX devices initialized: {[str(d) for d in devices]}"
        })
    except Exception as e:
        checks.append({
            "check": "JAX Backend & Devices",
            "status": "INFO",
            "message": f"JAX device check skipped/unavailable: {e}"
        })

    # 2. TensorFlow & TFP compatibility
    try:
        import tensorflow as tf
        import tensorflow_probability as tfp
        _ = tfp.distributions.Normal(loc=0.0, scale=1.0).sample(1)
        checks.append({
            "check": "TensorFlow Probability Distribution Compatibility",
            "status": "PASS",
            "message": f"TF {tf.__version__} and TFP {tfp.__version__} sampling functional"
        })
    except Exception as e:
        checks.append({
            "check": "TensorFlow Probability Distribution Compatibility",
            "status": "WARN",
            "message": f"TFP sampling test failed: {e}"
        })

    # 3. ArviZ Summary / InferenceData Mock
    try:
        import arviz as az
        import numpy as np
        import xarray as xr
        idata = az.from_dict(posterior={"theta": np.random.normal(size=(4, 100))})
        summary = az.summary(idata)
        checks.append({
            "check": "ArviZ MCMC Summary Processor",
            "status": "PASS",
            "message": f"ArviZ v{az.__version__} computed MCMC summary with {len(summary)} rows"
        })
    except Exception as e:
        checks.append({
            "check": "ArviZ MCMC Summary Processor",
            "status": "WARN",
            "message": f"ArviZ summary computation failed: {e}"
        })

    # 4. Google Meridian Model Import Test
    try:
        import meridian
        from meridian.data import input_data
        from meridian.model import spec, model
        checks.append({
            "check": "Google Meridian Model Submodules",
            "status": "PASS",
            "message": "Successfully imported meridian.data, meridian.model, and model spec"
        })
    except Exception as e:
        checks.append({
            "check": "Google Meridian Model Submodules",
            "status": "WARN",
            "message": f"Meridian submodules import unavailable: {e}"
        })

    return checks


def main():
    json_mode = "--json" in sys.argv
    strict_mode = "--strict" in sys.argv

    if not json_mode:
        print("=" * 70)
        print("🔍 Google Meridian & Python Backend Dependency Diagnostics")
        print(f"🕒 Platform: {platform.system()} {platform.release()} ({platform.machine()})")
        print(f"🐍 Python: {sys.version.split()[0]} ({sys.executable})")
        print("=" * 70 + "\n")

    results: List[Dict[str, Any]] = []
    for pkg_name, spec in DEPENDENCY_SPECS.items():
        res = probe_module(pkg_name, spec)
        results.append(res)

    interop_checks = probe_interoperability()

    if json_mode:
        output = {
            "platform": platform.platform(),
            "python_version": sys.version,
            "packages": results,
            "interoperability": interop_checks
        }
        print(json.dumps(output, indent=2))
        return

    # Print Package Table
    print(f"{'Package':<24} | {'Status':<6} | {'Installed':<12} | {'Required':<10} | {'Description'}")
    print("-" * 70)
    for r in results:
        status_icon = "✅" if r["status"] == "PASS" else "⚠️" if r["status"] == "WARN" else "❌"
        ver_display = r["version"] or "Missing"
        print(f"{r['package']:<24} | {status_icon} {r['status']:<4} | {ver_display:<12} | >={r['min_version']:<8} | {r['description']}")
        if r["error"]:
            print(f"   ↳ ⚠️ Notice: {r['error']}")

    print("\n" + "=" * 70)
    print("🔬 Interoperability & Integration Checks")
    print("-" * 70)
    for check in interop_checks:
        icon = "✅" if check["status"] == "PASS" else "⚠️" if check["status"] == "WARN" else "ℹ️"
        print(f"{icon} [{check['status']}] {check['check']}: {check['message']}")

    # Evaluation & Recommendations
    fails = [r for r in results if r["status"] == "FAIL"]
    warns = [r for r in results if r["status"] == "WARN"]

    print("\n" + "=" * 70)
    if not fails and not warns:
        print("🎉 All Google Meridian dependencies and versions are fully compatible!")
    elif fails:
        print(f"❌ {len(fails)} critical package(s) missing or incompatible.")
        print("   To install/update Python MMM backend dependencies, run:")
        print("   👉 pip3 install -r mmm-service/requirements.txt")
    else:
        print(f"⚠️ {len(warns)} warning(s) detected regarding optional packages or version variances.")
    print("=" * 70 + "\n")

    if strict_mode and (fails or warns):
        sys.exit(1)


if __name__ == "__main__":
    main()
