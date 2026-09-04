import { DECISION_ENGINE_VERSION } from './insightTypes';

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const derivedCache = new Map<string, { value: unknown; createdAt: number }>();

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function derivedCacheKey(modelId: string, operation: string, configuration: unknown): string {
  return `${modelId}:${operation}:${DECISION_ENGINE_VERSION}:${stable(configuration)}`;
}

export function cachedDerivedResult<T>(key: string, calculate: () => T): T {
  const cached = derivedCache.get(key);
  if (cached && Date.now() - cached.createdAt <= CACHE_TTL_MS) return cached.value as T;
  if (cached) derivedCache.delete(key);
  const result = calculate();
  derivedCache.set(key, { value: result, createdAt: Date.now() });
  while (derivedCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = derivedCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    derivedCache.delete(oldestKey);
  }
  return result;
}

export function clearDerivedCache(modelId?: string): void {
  if (!modelId) {
    derivedCache.clear();
    return;
  }
  const prefix = `${modelId}:`;
  for (const key of derivedCache.keys()) {
    if (key.startsWith(prefix)) derivedCache.delete(key);
  }
}
