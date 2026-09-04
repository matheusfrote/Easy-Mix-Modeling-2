import { createHash } from 'node:crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { AINarrative } from '../../types/mmm';
import { AIContext, shouldCallAi } from '../../services/insights';

export const AI_PROMPT_VERSION = 'executive-narrative-v1';

export interface AIProviderResult {
  text: string;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
}

export interface AINarrativeProvider {
  generate(input: { prompt: string; maxOutputTokens: number; timeoutMs: number }): Promise<AIProviderResult>;
}

export interface AINarrativeResult {
  status: 'generated' | 'disabled' | 'timeout' | 'failed' | 'invalid';
  narrative: AINarrative | null;
  cacheHit: boolean;
  usage: AIProviderResult['usage'];
  error?: string;
}

export interface AIUsageMetrics {
  requestCount: number;
  cacheHits: number;
  deduplicatedRequests: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

const ZERO_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

function configuredInteger(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  return Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function addUsage(current: number | null, additional: number | null): number | null {
  return current === null || additional === null ? null : current + additional;
}

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

function compactContext(context: AIContext, maxInputTokens: number): AIContext {
  const maxChars = maxInputTokens * 3;
  const compact = structuredClone(context);
  while (compact.recommendations.length > 1 && stable(compact).length > maxChars) {
    compact.recommendations.pop();
  }
  return compact;
}

function promptFor(context: AIContext, maxInputTokens: number): string {
  const compact = compactContext(context, maxInputTokens);
  return [
    'Tarefa: melhorar somente a clareza da narrativa executiva já calculada.',
    'Não calcule, estime, corrija ou crie métricas. Não cite números; eles serão renderizados pela camada determinística.',
    'Use apenas as recomendações e riscos fornecidos. Responda no schema JSON solicitado.',
    `promptVersion=${AI_PROMPT_VERSION}`,
    `context=${stable(compact)}`
  ].join('\n');
}

function parseNarrative(text: string): AINarrative | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const arrays = ['keyFindings', 'recommendedActions', 'risks'] as const;
  if (typeof record.executiveSummary !== 'string') return null;
  if (arrays.some(key => !Array.isArray(record[key]) || (record[key] as unknown[]).some(item => typeof item !== 'string'))) {
    return null;
  }
  const narrative: AINarrative = {
    executiveSummary: record.executiveSummary.trim(),
    keyFindings: (record.keyFindings as string[]).slice(0, 5).map(item => item.trim()),
    recommendedActions: (record.recommendedActions as string[]).slice(0, 5).map(item => item.trim()),
    risks: (record.risks as string[]).slice(0, 5).map(item => item.trim())
  };
  const allText = [narrative.executiveSummary, ...narrative.keyFindings, ...narrative.recommendedActions, ...narrative.risks];
  if (allText.some(item => !item || item.length > 500 || /\d/.test(item))) return null;
  return narrative;
}

class GeminiNarrativeProvider implements AINarrativeProvider {
  async generate(input: { prompt: string; maxOutputTokens: number; timeoutMs: number }): Promise<AIProviderResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      contents: input.prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: input.maxOutputTokens,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            risks: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['executiveSummary', 'keyFindings', 'recommendedActions', 'risks']
        },
        httpOptions: { timeout: input.timeoutMs }
      }
    });
    if (!response.text) throw new Error('EMPTY_AI_RESPONSE');
    return {
      text: response.text,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? null,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
        totalTokens: response.usageMetadata?.totalTokenCount ?? null
      }
    };
  }
}

export class AINarrativeService {
  private readonly cache = new Map<string, AINarrative>();
  private readonly inFlight = new Map<string, Promise<AINarrativeResult>>();
  private metrics: AIUsageMetrics = {
    requestCount: 0,
    cacheHits: 0,
    deduplicatedRequests: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0
  };

  constructor(private readonly provider: AINarrativeProvider = new GeminiNarrativeProvider()) {}

  async enhance(input: {
    explicitlyRequested: boolean;
    context: AIContext;
    outputType: 'executive_report';
    environment?: NodeJS.ProcessEnv;
  }): Promise<AINarrativeResult> {
    const environment = input.environment || process.env;
    if (!shouldCallAi(input.explicitlyRequested, environment)) {
      return { status: 'disabled', narrative: null, cacheHit: false, usage: ZERO_USAGE };
    }
    const key = createHash('sha256').update(stable({
      modelId: input.context.modelId,
      decisionEngineVersion: input.context.decisionEngineVersion,
      context: input.context,
      promptVersion: AI_PROMPT_VERSION,
      outputType: input.outputType
    })).digest('hex');
    const cached = this.cache.get(key);
    if (cached) {
      this.metrics.cacheHits += 1;
      this.logUsage(input.context.modelId, input.outputType, true, ZERO_USAGE, 0);
      return { status: 'generated', narrative: cached, cacheHit: true, usage: ZERO_USAGE };
    }
    const pending = this.inFlight.get(key);
    if (pending) {
      this.metrics.deduplicatedRequests += 1;
      const result = await pending;
      this.logUsage(input.context.modelId, input.outputType, true, ZERO_USAGE, 0);
      return { ...result, cacheHit: result.status === 'generated', usage: ZERO_USAGE };
    }

    const request = this.callProvider(key, input.context, input.outputType, environment);
    this.inFlight.set(key, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(key);
    }
  }

  getMetrics(): AIUsageMetrics {
    return { ...this.metrics };
  }

  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.metrics = { requestCount: 0, cacheHits: 0, deduplicatedRequests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }

  private async callProvider(
    key: string,
    context: AIContext,
    outputType: string,
    environment: NodeJS.ProcessEnv
  ): Promise<AINarrativeResult> {
    const maxInputTokens = configuredInteger(environment.AI_MAX_INPUT_TOKENS, 1200, 200, 4000);
    const maxOutputTokens = configuredInteger(environment.AI_MAX_OUTPUT_TOKENS, 500, 100, 1200);
    const timeoutMs = configuredInteger(environment.AI_TIMEOUT_MS, 20000, 1000, 60000);
    const started = Date.now();
    this.metrics.requestCount += 1;
    try {
      const providerResult = await Promise.race([
        this.provider.generate({ prompt: promptFor(context, maxInputTokens), maxOutputTokens, timeoutMs }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs))
      ]);
      const narrative = parseNarrative(providerResult.text);
      this.metrics.inputTokens = addUsage(this.metrics.inputTokens, providerResult.usage.inputTokens);
      this.metrics.outputTokens = addUsage(this.metrics.outputTokens, providerResult.usage.outputTokens);
      this.metrics.totalTokens = addUsage(this.metrics.totalTokens, providerResult.usage.totalTokens);
      this.logUsage(context.modelId, outputType, false, providerResult.usage, Date.now() - started);
      if (!narrative) {
        return { status: 'invalid', narrative: null, cacheHit: false, usage: providerResult.usage, error: 'AI_OUTPUT_VALIDATION_FAILED' };
      }
      this.cache.set(key, narrative);
      while (this.cache.size > 100) {
        const oldestKey = this.cache.keys().next().value as string | undefined;
        if (!oldestKey) break;
        this.cache.delete(oldestKey);
      }
      return { status: 'generated', narrative, cacheHit: false, usage: providerResult.usage };
    } catch (error) {
      const timedOut = error instanceof Error && error.message === 'AI_TIMEOUT';
      this.logUsage(context.modelId, outputType, false, ZERO_USAGE, Date.now() - started);
      return {
        status: timedOut ? 'timeout' : 'failed',
        narrative: null,
        cacheHit: false,
        usage: ZERO_USAGE,
        error: timedOut ? 'AI_TIMEOUT' : 'AI_REQUEST_FAILED'
      };
    }
  }

  private logUsage(
    modelId: string,
    feature: string,
    cacheHit: boolean,
    usage: AIProviderResult['usage'],
    latencyMs: number
  ): void {
    console.info('[AI_USAGE]', JSON.stringify({
      modelId,
      feature,
      promptVersion: AI_PROMPT_VERSION,
      cacheHit,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      latencyMs,
      timestamp: new Date().toISOString()
    }));
  }
}

export const aiNarrativeService = new AINarrativeService();
