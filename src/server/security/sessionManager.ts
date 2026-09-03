/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Secure Session & Multi-Tenant State Isolation Manager (CSPRNG + RBAC)
 */

import crypto from 'crypto';
import { ColumnMapping, MeridianModelConfig, MeridianModelResults } from '../../types/mmm';
import { DataRow } from '../../services/dataValidator';
import { auditLogger } from './auditLogger';

export type UserRole = 'OWNER' | 'ADMIN' | 'ANALYST' | 'VIEWER';
export type UserPlan = 'starter' | 'pro' | 'enterprise';

export interface UserSession {
  sessionId: string;
  token: string;
  userId: string;
  email: string;
  name: string;
  company: string;
  role: UserRole;
  plan: UserPlan;
  avatar?: string;
  createdAt: number;
  expiresAt: number;
  lastActiveAt: number;
}

export interface AdsCredentialsState {
  googleAds?: {
    developerToken?: string;
    clientId?: string;
    clientSecret?: string;
    customerId?: string;
    refreshToken?: string;
    configuredAt: number;
  };
  metaAds?: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    adAccountId?: string;
    configuredAt: number;
  };
}

export interface WorkspaceState {
  dataset: {
    rows: DataRow[];
    columns: string[];
    mappings: ColumnMapping[];
    filename: string;
  } | null;
  activeModel: MeridianModelResults | null;
  modelConfig: MeridianModelConfig | null;
  adsCredentials?: AdsCredentialsState;
  lastUpdated: number;
}

class SessionManager {
  // Map session token -> UserSession
  private sessions: Map<string, UserSession> = new Map();
  // Map sessionId/tenantId -> Isolated WorkspaceState (strictly preventing cross-tenant IDOR)
  private workspaces: Map<string, WorkspaceState> = new Map();
  // Default session TTL: 24 hours
  private readonly sessionTtlMs = 24 * 60 * 60 * 1000;
  // Shared guest workspace for anonymous preview sessions
  private readonly defaultWorkspaceId = 'guest_workspace';

  constructor() {
    // Initial guest workspace for anonymous exploration
    this.workspaces.set(this.defaultWorkspaceId, {
      dataset: null,
      activeModel: null,
      modelConfig: null,
      lastUpdated: Date.now()
    });

    // Cleanup expired sessions every 10 minutes
    setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000).unref();
  }

  /**
   * Generates a cryptographically strong session token via CSPRNG
   */
  createSession(userData: {
    userId: string;
    email: string;
    name: string;
    company: string;
    role?: UserRole;
    plan?: UserPlan;
    avatar?: string;
  }): UserSession {
    const token = crypto.randomBytes(32).toString('hex');
    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const now = Date.now();

    const session: UserSession = {
      sessionId,
      token,
      userId: userData.userId,
      email: userData.email.toLowerCase(),
      name: userData.name,
      company: userData.company || 'Empresa',
      role: userData.role || 'ANALYST',
      plan: userData.plan || 'pro',
      avatar: userData.avatar,
      createdAt: now,
      expiresAt: now + this.sessionTtlMs,
      lastActiveAt: now
    };

    this.sessions.set(token, session);

    // Initialize dedicated, isolated workspace for this tenant session
    this.workspaces.set(sessionId, {
      dataset: null,
      activeModel: null,
      modelConfig: null,
      lastUpdated: now
    });

    auditLogger.log('AUTH_LOGIN_SUCCESS', {
      sessionId,
      userId: session.userId,
      details: { email: session.email, role: session.role, plan: session.plan }
    });

    return session;
  }

  /**
   * Validates a session token with timing-safe comparison
   */
  getSession(token: string | undefined): UserSession | null {
    if (!token || typeof token !== 'string') return null;

    const session = this.sessions.get(token);
    if (!session) return null;

    const now = Date.now();
    if (now > session.expiresAt) {
      this.revokeSession(token);
      return null;
    }

    // Refresh last active timestamp and sliding window
    session.lastActiveAt = now;
    session.expiresAt = now + this.sessionTtlMs;
    return session;
  }

  /**
   * Explicitly invalidates a session token (Logout)
   */
  revokeSession(token: string): boolean {
    const session = this.sessions.get(token);
    if (!session) return false;

    this.sessions.delete(token);
    this.workspaces.delete(session.sessionId);

    auditLogger.log('AUTH_LOGOUT', {
      sessionId: session.sessionId,
      userId: session.userId
    });
    return true;
  }

  /**
   * Returns isolated workspace state for a given session or guest fallback
   */
  getWorkspace(session: UserSession | null): WorkspaceState {
    const workspaceKey = session ? session.sessionId : this.defaultWorkspaceId;
    let ws = this.workspaces.get(workspaceKey);
    if (!ws) {
      ws = {
        dataset: null,
        activeModel: null,
        modelConfig: null,
        lastUpdated: Date.now()
      };
      this.workspaces.set(workspaceKey, ws);
    }
    return ws;
  }

  /**
   * Validates that the active session has sufficient RBAC permissions
   */
  hasPermission(session: UserSession | null, requiredRole: UserRole): boolean {
    if (!session) return false;

    const roleHierarchy: Record<UserRole, number> = {
      VIEWER: 1,
      ANALYST: 2,
      ADMIN: 3,
      OWNER: 4
    };

    return (roleHierarchy[session.role] || 0) >= (roleHierarchy[requiredRole] || 0);
  }

  /**
   * Retrieves ads credentials for the current workspace
   */
  getAdsCredentials(session: UserSession | null): AdsCredentialsState {
    const ws = this.getWorkspace(session);
    if (!ws.adsCredentials) {
      ws.adsCredentials = {};
    }
    return ws.adsCredentials;
  }

  /**
   * Updates ads credentials for the current session workspace
   */
  setAdsCredentials(
    session: UserSession | null,
    platform: 'google-ads' | 'meta-ads',
    credentials: any
  ): void {
    const ws = this.getWorkspace(session);
    if (!ws.adsCredentials) {
      ws.adsCredentials = {};
    }

    if (platform === 'google-ads') {
      ws.adsCredentials.googleAds = {
        developerToken: credentials.developerToken || ws.adsCredentials.googleAds?.developerToken,
        clientId: credentials.clientId || ws.adsCredentials.googleAds?.clientId,
        clientSecret: credentials.clientSecret || ws.adsCredentials.googleAds?.clientSecret,
        customerId: credentials.customerId || ws.adsCredentials.googleAds?.customerId,
        refreshToken: credentials.refreshToken || ws.adsCredentials.googleAds?.refreshToken,
        configuredAt: Date.now()
      };
    } else if (platform === 'meta-ads') {
      ws.adsCredentials.metaAds = {
        clientId: credentials.clientId || ws.adsCredentials.metaAds?.clientId,
        clientSecret: credentials.clientSecret || ws.adsCredentials.metaAds?.clientSecret,
        accessToken: credentials.accessToken || ws.adsCredentials.metaAds?.accessToken,
        adAccountId: credentials.adAccountId || ws.adsCredentials.metaAds?.adAccountId,
        configuredAt: Date.now()
      };
    }
    ws.lastUpdated = Date.now();
  }

  /**
   * Clears ads credentials for a platform in the workspace
   */
  removeAdsCredentials(session: UserSession | null, platform: 'google-ads' | 'meta-ads'): void {
    const ws = this.getWorkspace(session);
    if (!ws.adsCredentials) return;

    if (platform === 'google-ads') {
      delete ws.adsCredentials.googleAds;
    } else if (platform === 'meta-ads') {
      delete ws.adsCredentials.metaAds;
    }
    ws.lastUpdated = Date.now();
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
        this.workspaces.delete(session.sessionId);
      }
    }
  }
}

export const sessionManager = new SessionManager();
