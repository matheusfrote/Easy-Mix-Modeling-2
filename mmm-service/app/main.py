import sys
import json
import traceback
import math
import random

def transpose(mat):
    return [[mat[j][i] for j in range(len(mat))] for i in range(len(mat[0]))]

def matmul(A, B):
    result = [[0.0 for _ in range(len(B[0]))] for _ in range(len(A))]
    for i in range(len(A)):
        for j in range(len(B[0])):
            for k in range(len(B)):
                result[i][j] += A[i][k] * B[k][j]
    return result

def invert_matrix(mat):
    n = len(mat)
    # Augment with identity matrix
    aug = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(mat)]
    
    # Gauss-Jordan Elimination
    for i in range(n):
        # Pivot
        if abs(aug[i][i]) < 1e-12:
            for k in range(i+1, n):
                if abs(aug[k][i]) > 1e-12:
                    aug[i], aug[k] = aug[k], aug[i]
                    break
                    
        pivot = aug[i][i]
        if abs(pivot) < 1e-12:
            raise ValueError("Matrix is singular or ill-conditioned.")
            
        for j in range(2*n):
            aug[i][j] /= pivot
            
        for k in range(n):
            if k != i:
                factor = aug[k][i]
                for j in range(2*n):
                    aug[k][j] -= factor * aug[i][j]
                    
    # Extract inverse
    return [row[n:] for row in aug]

def apply_adstock(spends, alpha):
    res = []
    prev = 0.0
    for s in spends:
        curr = s + alpha * prev
        res.append(curr)
        prev = curr
    return res

def apply_hill(x_arr, slope, half_sat):
    res = []
    for x in x_arr:
        if x <= 0:
            res.append(0.0)
        else:
            num = x ** slope
            den = num + (half_sat ** slope)
            res.append(num / den)
    return res

def run_model(dataset, config):
    try:
        import meridian
        from meridian import Meridian
        # Full Meridian implementation here when available
        pass
    except ImportError:
        pass # Fallback to OLS Structural Time Series

    # Prepare data
    kpi_col = config.get('kpiColumn')
    media_channels = config.get('mediaChannels', [])
    control_cols = config.get('controlColumns', [])
    
    Y_raw = [float(row.get(kpi_col, 0)) for row in dataset]
    T = len(Y_raw)
    
    if T < 10:
        return {"status": "blocked", "reason": "Insufficient data (T < 10)"}
        
    media_raw = {}
    for ch in media_channels:
        sp_col = ch.get('spendColumn')
        name = ch.get('channelName', sp_col)
        media_raw[name] = [float(row.get(sp_col, 0)) for row in dataset]
        
    controls_raw = {}
    for ctrl in control_cols:
        controls_raw[ctrl] = [float(row.get(ctrl, 0)) for row in dataset]
        
    # Standardize Y for numerical stability during fitting
    mean_Y = sum(Y_raw) / T
    if mean_Y == 0: mean_Y = 1.0
    
    # Very basic grid search for Adstock & Hill
    # Since we can't run full MCMC, we find parameters that maximize R2
    best_media_transformed = {}
    media_params = {}
    
    alphas = [0.1, 0.3, 0.5, 0.7]
    slopes = [0.8, 1.0, 1.2, 1.5]
    
    for name, spends in media_raw.items():
        mean_spend = sum(spends) / T
        if mean_spend == 0: mean_spend = 1.0
        half_sats = [mean_spend * 0.5, mean_spend, mean_spend * 1.5]
        
        # We will pick a default if grid search is too heavy, but let's just pick one dynamically
        best_alpha = 0.3
        best_slope = 1.0
        best_half_sat = mean_spend
        best_r2 = -float('inf')
        best_trans = spends[:]
        
        # We just do a univariate pseudo-R2 check against Y
        for a in alphas:
            adstocked = apply_adstock(spends, a)
            for s in slopes:
                for hs in half_sats:
                    trans = apply_hill(adstocked, s, hs)
                    # correlation with Y
                    mean_x = sum(trans)/T
                    cov = sum((trans[i]-mean_x)*(Y_raw[i]-mean_Y) for i in range(T))
                    var_x = sum((trans[i]-mean_x)**2 for i in range(T))
                    if var_x > 0:
                        corr = cov / math.sqrt(var_x)
                    else:
                        corr = 0
                    if corr > best_r2:
                        best_r2 = corr
                        best_alpha = a
                        best_slope = s
                        best_half_sat = hs
                        best_trans = trans
                        
        media_params[name] = {
            "alpha": best_alpha,
            "slope": best_slope,
            "halfSat": best_half_sat
        }
        best_media_transformed[name] = best_trans
        
    # Construct Design Matrix X
    # Intercept + Seasonality + Controls + Media
    X = []
    cols = ["Intercept"]
    
    # Seasonality
    fourier_terms = config.get('seasonalityFourierTerms', 2)
    for k in range(1, fourier_terms + 1):
        cols.append(f"sin_{k}")
        cols.append(f"cos_{k}")
        
    for ctrl in control_cols:
        cols.append(ctrl)
        
    for ch in media_channels:
        cols.append(ch.get('channelName', ch.get('spendColumn')))
        
    for t in range(T):
        row = [1.0] # Intercept
        for k in range(1, fourier_terms + 1):
            row.append(math.sin(2 * math.pi * k * (t+1) / 52.0))
            row.append(math.cos(2 * math.pi * k * (t+1) / 52.0))
        for ctrl in control_cols:
            row.append(controls_raw[ctrl][t])
        for ch in media_channels:
            name = ch.get('channelName', ch.get('spendColumn'))
            row.append(best_media_transformed[name][t])
        X.append(row)
        
    # Y vector
    Y_mat = [[y] for y in Y_raw]
    
    # OLS: beta = (X^T X)^-1 X^T Y
    XT = transpose(X)
    XTX = matmul(XT, X)
    
    # Add small ridge to diagonal for numerical stability (prevent singular matrix)
    for i in range(len(XTX)):
        XTX[i][i] += 1e-6
        
    try:
        XTX_inv = invert_matrix(XTX)
    except Exception as e:
        return {"status": "blocked", "reason": "multicollinearity", "message": str(e)}
        
    XTY = matmul(XT, Y_mat)
    beta_mat = matmul(XTX_inv, XTY)
    betas = [b[0] for b in beta_mat]
    
    # Predictions & Residuals
    Y_pred = [0.0]*T
    residuals = [0.0]*T
    for t in range(T):
        pred = sum(X[t][j] * betas[j] for j in range(len(betas)))
        Y_pred[t] = pred
        residuals[t] = Y_raw[t] - pred
        
    SSE = sum(r**2 for r in residuals)
    SST = sum((y - mean_Y)**2 for y in Y_raw)
    R2 = 1 - (SSE / SST) if SST > 0 else 0
    MAPE = sum(abs(residuals[t] / Y_raw[t]) if Y_raw[t] > 0 else 0 for t in range(T)) / T
    RMSE = math.sqrt(SSE / T)
    
    df = T - len(betas)
    if df <= 0: df = 1
    MSE = SSE / df
    
    # Standard errors of betas: sqrt(MSE * diag(XTX_inv))
    se_betas = [math.sqrt(MSE * XTX_inv[j][j]) if XTX_inv[j][j] > 0 else 0 for j in range(len(betas))]
    
    # Build contributions
    # Intercept + Seasonality = Baseline
    baseline = []
    controls_contrib = []
    media_contrib = {}
    for ch in media_channels:
        name = ch.get('channelName', ch.get('spendColumn'))
        media_contrib[name] = []
        
    for t in range(T):
        b_val = betas[0] # Intercept
        idx = 1
        for k in range(fourier_terms * 2):
            b_val += X[t][idx] * betas[idx]
            idx += 1
        baseline.append(b_val)
        
        c_val = 0
        for ctrl in control_cols:
            c_val += X[t][idx] * betas[idx]
            idx += 1
        controls_contrib.append(c_val)
        
        for ch in media_channels:
            name = ch.get('channelName', ch.get('spendColumn'))
            m_val = X[t][idx] * betas[idx]
            media_contrib[name].append(m_val)
            idx += 1
            
    # Assemble channel parameters & outputs
    channels_output = []
    idx = 1 + fourier_terms * 2 + len(control_cols)
    
    total_media_kpi = 0
    for ch in media_channels:
        name = ch.get('channelName', ch.get('spendColumn'))
        beta = betas[idx]
        se = se_betas[idx]
        idx += 1
        
        inc_kpi = sum(media_contrib[name])
        total_media_kpi += inc_kpi
        spend = sum(media_raw[name])
        
        # 95% CI (1.96 * SE)
        ci025 = beta - 1.96 * se
        ci975 = beta + 1.96 * se
        
        channels_output.append({
            "channelName": name,
            "spend": spend,
            "incrementalKpi": inc_kpi,
            "roi": inc_kpi / spend if spend > 0 else 0,
            "mroi": (inc_kpi / spend) * media_params[name]['slope'] if spend > 0 else 0, # rough approximation for output
            "beta": beta,
            "betaCi": {
                "ci025": ci025,
                "ci050": beta,
                "ci975": ci975
            },
            "alpha": media_params[name]['alpha'],
            "halfSaturationSpend": media_params[name]['halfSat'],
            "slope": media_params[name]['slope']
        })

    # Output diagnostics and time series fit
    time_series_fit = []
    for t in range(T):
        time_series_fit.append({
            "date": dataset[t].get("date", str(t)),
            "actualKpi": Y_raw[t],
            "predictedKpi": Y_pred[t],
            "baseline": baseline[t],
            "controls": controls_contrib[t],
            "residual": residuals[t]
        })
        
    return {
        "status": "success",
        "method": "OLS Fallback (Meridian Not Available)",
        "diagnostics": {
            "r2": R2,
            "mape": MAPE,
            "rmse": RMSE,
            "r_hat": "N/A",
            "ess": "N/A",
            "bayesian_r2": "N/A",
            "baselineContribution": sum(baseline),
            "controlsContribution": sum(controls_contrib),
            "mediaContribution": total_media_kpi,
            "convergenceStatus": "N/A"
        },
        "channels": channels_output,
        "timeSeriesFit": time_series_fit
    }

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"status": "error", "message": "No input data"}))
            sys.exit(1)
            
        payload = json.loads(input_data)
        dataset = payload.get("dataset")
        config = payload.get("config")
        
        result = run_model(dataset, config)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }))
