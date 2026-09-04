/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Input validation, sanitization, formula injection mitigation, SSRF & MCMC bounds enforcement
 */

import path from 'path';
import { MeridianModelConfig } from '../../types/mmm';
import { auditLogger } from './auditLogger';

/**
 * Mitigates CSV / Spreadsheet Formula Injection (CWE-1236)
 * Characters '=', '+', '-', '@', '\t', '\r' at the start of a cell can trigger DDE/command execution in Excel/Calc.
 */
export function sanitizeSpreadsheetCell(value: any): any {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (trimmed.length === 0) return value;

  // A numeric measurement such as "-10" is data, not a spreadsheet formula.
  // Preserve it so scientific validation can report the negative value.
  if (Number.isFinite(Number(trimmed))) return value;

  const firstChar = trimmed[0];
  if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
    // Escape cell by prepending single quote
    return `'${trimmed}`;
  }

  return value;
}

/**
 * Sanitizes an array of data rows to neutralize formula injection
 */
export function sanitizeRowsForSpreadsheet(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map(row => {
    const cleanRow: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      cleanRow[key] = sanitizeSpreadsheetCell(val);
    }
    return cleanRow;
  });
}

/**
 * Neutralizes Path Traversal (CWE-22) in user-provided filenames
 */
export function sanitizeFilename(rawFilename: string | undefined | null): string {
  if (!rawFilename || typeof rawFilename !== 'string') {
    return 'dataset.csv';
  }

  // Normalize Windows-style backslashes to forward slashes first
  const normalized = rawFilename.replace(/\\/g, '/');
  // Extract base name only, remove all directory traversal sequences
  const base = path.basename(normalized).trim();
  // Strip control characters, null bytes, and non-printable chars
  const sanitized = base
    .replace(/[\x00-\x1F\x7F<>:"/\\|?*]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 120);

  return sanitized || 'dataset.csv';
}

/**
 * Enforces strict bounds on MCMC configuration to prevent Resource Exhaustion (DoS)
 * Limits:
 * - mcmcChains: [2, 8]
 * - mcmcDraws: [100, 5000]
 * - mcmcWarmup: [50, 2000]
 * - mediaChannels: max 20
 * - controlColumns: max 20
 */
export function validateAndClampMcmcConfig(config: MeridianModelConfig): {
  clampedConfig: MeridianModelConfig;
  wasModified: boolean;
} {
  let wasModified = false;
  const clamped: MeridianModelConfig = { ...config };

  const chains = Number(config.mcmcChains) || 4;
  if (chains < 2 || chains > 8) {
    clamped.mcmcChains = Math.max(2, Math.min(8, chains));
    wasModified = true;
  }

  const draws = Number(config.mcmcDraws) || 1000;
  if (draws < 100 || draws > 5000) {
    clamped.mcmcDraws = Math.max(100, Math.min(5000, draws));
    wasModified = true;
  }

  const warmup = Number(config.mcmcWarmup) || 500;
  if (warmup < 50 || warmup > 2000) {
    clamped.mcmcWarmup = Math.max(50, Math.min(2000, warmup));
    wasModified = true;
  }

  if (Array.isArray(config.mediaChannels) && config.mediaChannels.length > 20) {
    clamped.mediaChannels = config.mediaChannels.slice(0, 20);
    wasModified = true;
  }

  if (Array.isArray(config.controlColumns) && config.controlColumns.length > 20) {
    clamped.controlColumns = config.controlColumns.slice(0, 20);
    wasModified = true;
  }

  if (wasModified) {
    auditLogger.log('MCMC_BOUNDS_CLAMPED', {
      details: {
        originalChains: config.mcmcChains,
        clampedChains: clamped.mcmcChains,
        originalDraws: config.mcmcDraws,
        clampedDraws: clamped.mcmcDraws
      }
    });
  }

  return { clampedConfig: clamped, wasModified };
}

/**
 * Validates outgoing URLs to prevent Server-Side Request Forgery (SSRF - CWE-918)
 * Blocks loopback, RFC 1918 private subnets, cloud metadata services (169.254.169.254)
 */
export function isSafeExternalUrl(urlString: string, allowedHosts?: string[]): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { safe: false, reason: 'Protocolo inválido (apenas HTTP/HTTPS permitidos).' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost, loopback, link-local, cloud metadata
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return { safe: false, reason: 'Endereço IP ou hostname interno/privado não permitido.' };
    }

    // RFC 1918 private IP checks
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const b0 = parseInt(match[1], 10);
      const b1 = parseInt(match[2], 10);
      if (
        b0 === 10 || // 10.0.0.0/8
        (b0 === 172 && b1 >= 16 && b1 <= 31) || // 172.16.0.0/12
        (b0 === 192 && b1 === 168) || // 192.168.0.0/16
        (b0 === 169 && b1 === 254) || // 169.254.0.0/16 (Link Local)
        b0 === 127 || // Loopback
        b0 === 0 // 0.0.0.0
      ) {
        return { safe: false, reason: 'Acesso a sub-redes privadas RFC 1918 bloqueado por política de segurança.' };
      }
    }

    // Allowlist check if specified
    if (allowedHosts && allowedHosts.length > 0) {
      const isAllowed = allowedHosts.some(allowed => hostname === allowed || hostname.endsWith(`.${allowed}`));
      if (!isAllowed) {
        return { safe: false, reason: `Host ${hostname} não consta na allowlist de conectores seguros.` };
      }
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: 'URL malformada.' };
  }
}

/**
 * Sanitizes untrusted user text before passing it to LLM to mitigate Prompt Injection
 */
export function sanitizeAiPromptInput(input: string | undefined | null, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';

  const trimmed = input.trim().slice(0, maxLength);

  // Neutralize common prompt injection patterns and delimiters
  return trimmed
    .replace(/<\|endoftext\|>/gi, '')
    .replace(/\[\s*system\s*\]/gi, '[user]')
    .replace(/<\s*system\s*>/gi, '<user>')
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[filtro: comando ignorado]')
    .replace(/ignorar\s+(todas\s+as\s+)?instruções\s+anteriores/gi, '[filtro: comando ignorado]')
    .replace(/system\s*prompt\s*:/gi, 'prompt:')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // strip ASCII control chars
}
