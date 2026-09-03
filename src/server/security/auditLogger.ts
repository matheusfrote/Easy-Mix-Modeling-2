/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Security Audit Logger with automated PII & credential redaction
 */

export type AuditAction =
  | 'AUTH_LOGIN_ATTEMPT'
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'SESSION_REVOKED'
  | 'DATASET_UPLOAD'
  | 'DATASET_SANITIZE'
  | 'MODEL_RUN_STARTED'
  | 'MODEL_RUN_COMPLETED'
  | 'MODEL_RUN_FAILED'
  | 'BUDGET_OPTIMIZED'
  | 'SCENARIO_SIMULATED'
  | 'REPORT_GENERATED'
  | 'CONNECTOR_AUTH_ATTEMPT'
  | 'CONNECTOR_SYNC'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_INPUT_BLOCKED'
  | 'MCMC_BOUNDS_CLAMPED';

export interface AuditLogEntry {
  timestamp: string;
  action: AuditAction;
  sessionId?: string;
  userId?: string;
  ip?: string;
  path?: string;
  method?: string;
  status?: number;
  details?: Record<string, any>;
}

// Keys that must NEVER be logged or leaked into audit logs
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'credential',
  'secret',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'bearer',
  'api_key',
  'apikey',
  'client_secret',
  'cookie',
  'session',
  'creditcard',
  'credit_card',
  'card',
  'cvv',
  'ssn',
  'cpf'
]);

/**
 * Deeply redacts sensitive credentials, tokens, and PII from log payloads
 */
export function redactSensitiveData(data: any, depth = 0): any {
  if (depth > 4) return '[MAX_DEPTH]';
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.slice(0, 50).map(item => redactSensitiveData(item, depth + 1));
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('pass')) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = redactSensitiveData(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private readonly maxMemoryLogs = 1000;

  log(action: AuditAction, meta: Omit<AuditLogEntry, 'timestamp' | 'action'>): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      sessionId: meta.sessionId,
      userId: meta.userId,
      ip: meta.ip ? meta.ip.replace(/:\d+$/, '') : undefined,
      path: meta.path,
      method: meta.method,
      status: meta.status,
      details: meta.details ? redactSensitiveData(meta.details) : undefined
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxMemoryLogs) {
      this.logs.shift();
    }

    // Structured server log for observability
    const prefix = `[AUDIT] [${entry.timestamp}] [${action}]`;
    if (action.includes('FAILURE') || action.includes('BLOCKED') || action.includes('EXCEEDED')) {
      console.warn(prefix, JSON.stringify(entry));
    } else {
      console.info(prefix, JSON.stringify(entry));
    }
  }

  getRecentLogs(limit = 100): AuditLogEntry[] {
    return this.logs.slice(-limit);
  }
}

export const auditLogger = new AuditLogger();
