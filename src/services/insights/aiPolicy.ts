export type AiMode = 'off' | 'on_demand';

export function getAiMode(environment: NodeJS.ProcessEnv = process.env): AiMode {
  return environment.AI_MODE === 'on_demand' ? 'on_demand' : 'off';
}

export function shouldCallAi(explicitlyRequested: boolean, environment: NodeJS.ProcessEnv = process.env): boolean {
  return getAiMode(environment) === 'on_demand' && explicitlyRequested;
}

export async function resolveWithOptionalAi<T>(
  explicitlyRequested: boolean,
  deterministicValue: T,
  aiCall: () => Promise<T>,
  environment: NodeJS.ProcessEnv = process.env
): Promise<T> {
  if (!shouldCallAi(explicitlyRequested, environment)) return deterministicValue;
  return aiCall();
}
