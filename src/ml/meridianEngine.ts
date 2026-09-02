import { spawn } from 'child_process';
import { DataRow } from '../services/dataValidator';
import { MeridianModelConfig, MeridianModelResults, BudgetOptimizationResult, ScenarioDefinition } from '../types/mmm';

export class MeridianEngine {
  
  public async fitModel(data: DataRow[], config: MeridianModelConfig): Promise<MeridianModelResults> {
    return new Promise((resolve, reject) => {
      const pythonScript = `
import sys
import json
import pandas as pd

def main():
    try:
        input_data_json = sys.stdin.read()
        payload = json.loads(input_data_json)
        data = payload.get('data', [])
        config = payload.get('config', {})
        
        try:
            import meridian
            from meridian.data import input_data
            from meridian.model import spec, model
            from meridian.analysis import analyzer
        except ImportError as e:
            print(json.dumps({"status": "error", "code": "MERIDIAN_UNAVAILABLE", "message": str(e)}))
            sys.exit(0)
            
        df = pd.DataFrame(data)
        date_col = config.get("dateColumn", "date")
        kpi_col = config.get("kpiColumn", "revenue")
        media_channels_config = config.get("mediaChannels", [])
        media_cols = [c["spendColumn"] for c in media_channels_config]
        controls = config.get("controlColumns", [])
        
        builder = input_data.DataFrameInputDataBuilder(df)
        builder = builder.with_kpi(kpi_col)
        builder = builder.with_media(media_cols)
        if controls:
            builder = builder.with_controls(controls)
            
        built_data = builder.build()
        model_spec = spec.ModelSpec()
        
        meridian_model = model.Meridian(input_data=built_data, model_spec=model_spec)
        
        n_chains = int(config.get("mcmcChains", 4))
        n_draws = int(config.get("mcmcDraws", 1000))
        n_warmup = int(config.get("mcmcWarmup", 500))
        
        meridian_model.sample_posterior(
            n_chains=n_chains,
            n_adapt=n_warmup,
            n_burnin=n_warmup,
            n_keep=n_draws
        )
        
        az_obj = analyzer.Analyzer(meridian_model)
        
        roi_df = az_obj.roi_summary()
        mroi_df = az_obj.marginal_roi_summary()
        
        print(json.dumps({
            "status": "success",
            "results": {
               "modelId": "meridian_real",
               "isSyntheticData": False,
               "roi_summary": roi_df.to_dict(orient="records") if not roi_df.empty else [],
               "mroi_summary": mroi_df.to_dict(orient="records") if not mroi_df.empty else []
            }
        }))
        
    except Exception as e:
        print(json.dumps({"status": "error", "code": "MODELING_ERROR", "message": str(e)}))
        sys.exit(0)

if __name__ == '__main__':
    main()
`;

      const pyProcess = spawn('python3', ['-c', pythonScript]);
      
      let outputData = '';
      let errorData = '';

      pyProcess.stdout.on('data', (chunk) => {
        outputData += chunk.toString();
      });

      pyProcess.stderr.on('data', (chunk) => {
        errorData += chunk.toString();
      });

      pyProcess.on('close', (code) => {
        try {
          const result = JSON.parse(outputData);
          if (result.status === 'error') {
             if (result.code === 'MERIDIAN_UNAVAILABLE') {
               reject(new Error(`MERIDIAN_UNAVAILABLE: ${result.message}`));
             } else {
               reject(new Error(result.message));
             }
          } else {
             resolve(result.results as any);
          }
        } catch (e) {
          reject(new Error(`MERIDIAN_UNAVAILABLE: Falha ao executar subprocesso Python. Error: ${errorData}`));
        }
      });

      pyProcess.stdin.write(JSON.stringify({ data, config }));
      pyProcess.stdin.end();
    });
  }

  public async optimizeBudget(results: MeridianModelResults, targetTotalBudget: number, constraints?: any): Promise<BudgetOptimizationResult> {
    throw new Error('MERIDIAN_UNAVAILABLE');
  }

  public async simulateScenario(results: MeridianModelResults, spends: Record<string, number>): Promise<ScenarioDefinition> {
    throw new Error('MERIDIAN_UNAVAILABLE');
  }
}
