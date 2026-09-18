import { db, StoredUser } from '@/lib/db';
import { AuthUser, OAuthProvider, CandidateProfileData } from '@/types';

export const APP_DEV_URL = 'https://ais-dev-ss5pessumkhmwglkreltsp-49121961165.asia-east1.run.app';
export const APP_SHARED_URL = 'https://ais-pre-ss5pessumkhmwglkreltsp-49121961165.asia-east1.run.app';
export const SESSION_COOKIE_NAME = 'autoapply_session_token';
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

// In-memory active session store
export interface ActiveSession {
  token: string;
  userId: string;
  provider: OAuthProvider;
  createdAt: number;
  expiresAt: number;
}

class SessionManager {
  private static instance: SessionManager;
  public sessions: Map<string, ActiveSession> = new Map();

  private constructor() {
    // No default sessions - strict authentication enforced
  }

  public static getInstance(): SessionManager {
    if (!(globalThis as any).__sessionManagerInstance) {
      (globalThis as any).__sessionManagerInstance = new SessionManager();
    }
    return (globalThis as any).__sessionManagerInstance;
  }
}

export const sessionStore = SessionManager.getInstance();

export function getBaseAppUrl(req?: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  if (req) {
    const origin = req.headers.get('origin');
    if (origin && !origin.includes('localhost:3000')) return origin.replace(/\/$/, '');
    const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    if (host && !host.includes('localhost:3000')) {
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }
  return APP_DEV_URL;
}

export function getRedirectUri(req?: Request): string {
  const base = getBaseAppUrl(req);
  return `${base}/api/auth/callback`;
}

export function getOAuthStatus() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || '';
  const githubClientId = process.env.GITHUB_CLIENT_ID || '';
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET || '';

  return {
    google: {
      isConfigured: Boolean(googleClientId && googleClientSecret),
      clientId: googleClientId ? `${googleClientId.substring(0, 8)}...` : null
    },
    github: {
      isConfigured: Boolean(githubClientId && githubClientSecret),
      clientId: githubClientId ? `${githubClientId.substring(0, 6)}...` : null
    },
    demo: {
      isConfigured: true,
      label: '1-Click Instant Demo OAuth'
    },
    callbackUrls: {
      development: `${APP_DEV_URL}/api/auth/callback`,
      shared: `${APP_SHARED_URL}/api/auth/callback`
    }
  };
}

export function buildOAuthUrl(provider: OAuthProvider, redirectUri: string, state: string): { url: string; isConfigured: boolean } {
  const status = getOAuthStatus();

  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
    if (!clientId || !status.google.isConfigured) {
      // Return demo authorize URL configured as Google
      const demoUrl = `${redirectUri.replace('/api/auth/callback', '/api/auth/demo-authorize')}?provider=google&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
      return { url: demoUrl, isConfigured: false };
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state
    });
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      isConfigured: true
    };
  }

  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId || !status.github.isConfigured) {
      const demoUrl = `${redirectUri.replace('/api/auth/callback', '/api/auth/demo-authorize')}?provider=github&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
      return { url: demoUrl, isConfigured: false };
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state
    });
    return {
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
      isConfigured: true
    };
  }

  // Demo Provider (Always available for testing and preview)
  const demoUrl = `${redirectUri.replace('/api/auth/callback', '/api/auth/demo-authorize')}?provider=demo&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  return { url: demoUrl, isConfigured: true };
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<{ email: string; name: string; avatarUrl?: string; providerId: string }> {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      // If credentials aren't configured but we get here, it means we went through the demo-authorize flow
      const decoded = decodeDemoCode(code);
      return {
        email: decoded.email,
        name: decoded.name,
        avatarUrl: decoded.avatarUrl,
        providerId: `demo_${Date.now()}`
      };
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${err}`);
    }

    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userRes.ok) {
      throw new Error('Failed to fetch Google userinfo profile.');
    }

    const userData = await userRes.json();
    return {
      email: userData.email,
      name: userData.name || userData.email.split('@')[0],
      avatarUrl: userData.picture,
      providerId: userData.id
    };
  }

  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      // If credentials aren't configured but we get here, it means we went through the demo-authorize flow
      const decoded = decodeDemoCode(code);
      return {
        email: decoded.email,
        name: decoded.name,
        avatarUrl: decoded.avatarUrl,
        providerId: `demo_${Date.now()}`
      };
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(`GitHub token exchange error: ${tokenData.error_description || tokenData.error}`);
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AutoApply-AI'
      }
    });

    const userData = await userRes.json();

    // Get email if private
    let email = userData.email;
    if (!email) {
      try {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'AutoApply-AI'
          }
        });
        const emails = await emailsRes.json();
        const primary = emails.find((e: any) => e.primary) || emails[0];
        if (primary) email = primary.email;
      } catch (e) {
        // Fallback email
      }
    }

    return {
      email: email || `${userData.login}@users.noreply.github.com`,
      name: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      providerId: String(userData.id)
    };
  }

  // Demo OAuth exchange
  const decoded = decodeDemoCode(code);
  return {
    email: decoded.email,
    name: decoded.name,
    avatarUrl: decoded.avatarUrl,
    providerId: `demo_${Date.now()}`
  };
}

export function encodeDemoCode(data: { email: string; name: string; avatarUrl?: string; provider?: string }): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeDemoCode(code: string): { email: string; name: string; avatarUrl?: string; provider?: string } {
  try {
    const json = Buffer.from(code, 'base64url').toString('utf-8');
    return JSON.parse(json);
  } catch (e) {
    return {
      email: 'samaddersourasish2006@gmail.com',
      name: 'Sourasish Samadder',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      provider: 'demo'
    };
  }
}

export function findOrCreateOAuthUser(payload: {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: OAuthProvider;
  providerId: string;
}): StoredUser {
  const existingUser = db.users.find(u => u.email.toLowerCase() === payload.email.toLowerCase());

  if (existingUser) {
    // Update avatar and name if missing
    if (payload.avatarUrl) existingUser.avatarUrl = payload.avatarUrl;
    if (payload.name && existingUser.name === 'Alex Chen') existingUser.name = payload.name;
    return existingUser;
  }

  // Create new user in tenant
  const newUserId = `user_oauth_${Date.now()}`;
  const newUser: StoredUser = {
    id: newUserId,
    tenantId: 'tenant_prod_enterprise_1',
    email: payload.email,
    name: payload.name,
    role: 'CANDIDATE',
    avatarUrl: payload.avatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`
  };

  db.users.push(newUser);

  // Initialize a profile based on user's identity
  const newProfile: CandidateProfileData = {
    id: `prof_${newUserId}`,
    userId: newUserId,
    fullName: payload.name,
    email: payload.email,
    headline: `${payload.name} — Full Stack Software Engineer & Systems Architect`,
    summary: `Results-driven software engineer experienced in building modern web applications, scalable APIs, and distributed systems.`,
    desiredTitles: ['Full Stack Engineer', 'Software Engineer', 'Backend Developer'],
    preferredLocations: ['Remote', 'San Francisco, CA', 'Bengaluru, India'],
    remotePreference: 'REMOTE_OR_HYBRID',
    expectedSalaryLPA: 28,
    minSalary: 2000000,
    noticePeriod: '30_DAYS',
    requiresVisa: false,
    workAuthorization: 'Authorized to work (No sponsorship required)',
    yearsOfExperience: 3,
    skills: [
      { name: 'TypeScript', category: 'TECHNICAL', years: 3, level: 'EXPERT' },
      { name: 'React', category: 'FRAMEWORK', years: 3, level: 'EXPERT' },
      { name: 'Node.js', category: 'TECHNICAL', years: 3, level: 'EXPERT' },
      { name: 'Next.js', category: 'FRAMEWORK', years: 2, level: 'ADVANCED' },
      { name: 'PostgreSQL', category: 'TECHNICAL', years: 3, level: 'ADVANCED' },
      { name: 'Tailwind CSS', category: 'FRAMEWORK', years: 2, level: 'ADVANCED' }
    ],
    experiences: [
      {
        id: `exp_${Date.now()}`,
        company: 'CloudScale Technologies',
        role: 'Software Development Engineer',
        location: 'Remote',
        startDate: '2022-01',
        endDate: null,
        isCurrent: true,
        description: 'Building microservices and full-stack cloud applications.',
        bullets: [
          'Engineered resilient APIs and customer-facing interfaces processing thousands of concurrent requests.',
          'Reduced response latency by 35% through query optimization and distributed caching.'
        ],
        technologies: ['TypeScript', 'React', 'Node.js', 'PostgreSQL']
      }
    ],
    educations: [
      {
        id: `edu_${Date.now()}`,
        institution: 'University School of Engineering',
        degree: 'Bachelor of Technology in Computer Science',
        fieldOfStudy: 'Computer Science',
        startDate: '2018',
        endDate: '2022',
        gradeGpa: '8.8 / 10.0',
        highlights: ['First Class with Distinction']
      }
    ],
    projects: [],
    achievements: [],
    certifications: []
  };

  db.profiles.set(newUserId, newProfile);

  return newUser;
}

export function createSession(userId: string, provider: OAuthProvider): string {
  const token = `sess_${provider}_${Math.random().toString(36).substring(2)}_${Date.now()}`;
  const now = Date.now();
  sessionStore.sessions.set(token, {
    token,
    userId,
    provider,
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE_SEC * 1000
  });
  return token;
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      cookies[name] = decodeURIComponent(val);
    }
  });
  return cookies;
}

export function extractSessionToken(req?: Request | null): string | null {
  if (!req) return null;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Check Cookie header
  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  if (cookies[SESSION_COOKIE_NAME]) {
    return cookies[SESSION_COOKIE_NAME];
  }

  return null;
}

export async function getSessionUser(req?: Request | null): Promise<StoredUser | null> {
  const token = extractSessionToken(req);
  if (!token) return null;

  const session = sessionStore.sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessionStore.sessions.delete(token);
    return null;
  }

  const user = db.users.find(u => u.id === session.userId);
  return user || null;
}

export async function getCurrentUserId(req?: Request | null): Promise<string | null> {
  const user = await getSessionUser(req);
  return user ? user.id : null;
}

export function getSessionCookieHeader(token: string): string {
  // SameSite=None; Secure is MANDATORY for AI Studio iframe cross-origin authentication
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; SameSite=None; Secure; HttpOnly`;
}

export function getClearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=None; Secure; HttpOnly`;
}
