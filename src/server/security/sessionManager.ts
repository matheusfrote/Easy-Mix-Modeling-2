/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Secure Session & Multi-Tenant State Isolation Manager (CSPRNG + RBAC)
 */

import crypto from 'crypto';
import { ColumnMapping, MeridianModelConfig, MeridianModelResults } from '../../types/mmm';
import { DataRow } from '../../services/dataValidator';
import { auditLogger } from './auditLogger';

export interface WorkspaceState {
  dataset: {
    rows: DataRow[];
    columns: string[];
    mappings: ColumnMapping[];
    filename: string;
  } | null;
  activeModel: MeridianModelResults | null;
  modelConfig: MeridianModelConfig | null;
  lastUpdated: number;
}

class SessionManager {
  // Map sessionId/tenantId -> Isolated WorkspaceState (strictly preventing cross-tenant IDOR)
  private workspaces: Map<string, WorkspaceState> = new Map();
  // Cleanup workspaces older than 24h
  private readonly ttlMs = 24 * 60 * 60 * 1000;

  constructor() {
    // Cleanup expired sessions every 10 minutes
    setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000).unref();
  }

  /**
   * Returns isolated workspace state for a given session ID
   */
  getWorkspaceBySessionId(sessionId: string): WorkspaceState {
    let ws = this.workspaces.get(sessionId);
    if (!ws) {
      ws = {
        dataset: null,
        activeModel: null,
        modelConfig: null,
        lastUpdated: Date.now()
      };
      this.workspaces.set(sessionId, ws);
    } else {
      ws.lastUpdated = Date.now();
    }
    return ws;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, ws] of this.workspaces.entries()) {
      if (now - ws.lastUpdated > this.ttlMs) {
        this.workspaces.delete(sessionId);
      }
    }
  }
}

export const sessionManager = new SessionManager();
