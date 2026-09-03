/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Cryptographic Google OAuth Token Verification
 */

import { auditLogger } from './auditLogger';

export interface VerifiedGoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  company?: string;
  hd?: string;
}

/**
 * Validates Google ID token against Google's public OAuth2 verification endpoint
 * Enforces cryptographic signature check, issuer, audience, and expiration.
 */
export async function verifyGoogleIdToken(token: string): Promise<VerifiedGoogleProfile> {
  if (!token || typeof token !== 'string' || token.trim().length < 10) {
    throw new Error('Token de autenticação Google não fornecido ou inválido.');
  }

  const expectedClientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    '1082938472910-easymixmodeling.apps.googleusercontent.com';

  // 1. Verify token cryptographically with Google's tokeninfo API
  const tokeninfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;

  let tokenData: any = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(tokeninfoUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      tokenData = await res.json();
    } else {
      const errText = await res.text().catch(() => '');
      throw new Error(`Google API rejeitou o token: ${errText || res.statusText}`);
    }
  } catch (networkError: any) {
    // If online validation fails with timeout or rejection
    auditLogger.log('AUTH_LOGIN_FAILURE', {
      details: { reason: 'Google verification failed', error: networkError.message }
    });
    throw new Error(`Validação de assinatura do token Google falhou: ${networkError.message}`);
  }

  // 2. Validate issuer
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!validIssuers.includes(tokenData.iss)) {
    throw new Error(`Emissor inválido no token Google (${tokenData.iss}).`);
  }

  // 3. Validate audience if client ID is configured
  if (expectedClientId && tokenData.aud !== expectedClientId) {
    // Audit mismatch
    auditLogger.log('AUTH_LOGIN_FAILURE', {
      details: { reason: 'Audience mismatch', expected: expectedClientId, received: tokenData.aud }
    });
    throw new Error('A audiência (aud) do token Google não corresponde à desta aplicação.');
  }

  // 4. Validate expiration
  const exp = Number(tokenData.exp);
  const nowInSec = Math.floor(Date.now() / 1000);
  if (isNaN(exp) || exp < nowInSec) {
    throw new Error('Token Google expirado.');
  }

  // 5. Extract and validate required claims
  const email = tokenData.email;
  const sub = tokenData.sub;
  if (!email || !sub) {
    throw new Error('Token Google não contém reivindicações obrigatórias de email ou identificador do usuário.');
  }

  let company = '';
  if (tokenData.hd) {
    company = String(tokenData.hd).toUpperCase();
  } else if (email.includes('@')) {
    const domain = email.split('@')[1];
    company = domain.split('.')[0].toUpperCase();
  }

  return {
    googleId: sub,
    email: email.toLowerCase(),
    name: tokenData.name || email.split('@')[0],
    picture: tokenData.picture,
    company: company || 'Empresa',
    hd: tokenData.hd
  };
}
