import pytest
import pandas as pd
import numpy as np

try:
    import meridian
    from meridian.data import input_data
    from meridian.model import spec
    from meridian.model.model import Meridian
    from meridian.analysis import analyzer
    MERIDIAN_AVAILABLE = True
except ImportError:
    MERIDIAN_AVAILABLE = False

@pytest.mark.skipif(not MERIDIAN_AVAILABLE, reason="Meridian is not installed")
def test_meridian_e2e():
    n_times = 52
    time = pd.date_range("2023-01-01", periods=n_times, freq="W")
    df = pd.DataFrame({
        "time": time,
        "kpi": np.random.normal(1000, 100, n_times),
        "tv_spend": np.random.uniform(100, 500, n_times),
        "digital_spend": np.random.uniform(50, 200, n_times)
    })

    builder = input_data.DataFrameInputDataBuilder()
    builder.with_time(df, "time")
    builder.with_kpi(df, "kpi")
    builder.with_media(df, media_cols=["tv_spend", "digital_spend"], media_spend_cols=["tv_spend", "digital_spend"])
    data = builder.build()

    model_spec = spec.ModelSpec()
    mm = Meridian(input_data=data, model_spec=model_spec)
    
    mm.sample_prior(n_samples=5)
    mm.sample_posterior(n_chains=2, n_adapt=5, n_burnin=5, n_keep=5)

    anz = analyzer.Analyzer(mm)
    assert anz is not None
