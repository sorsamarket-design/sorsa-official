import { getAuthScopeForPath, requireSupabase } from './supabase';

const launchEndpoint = import.meta.env.VITE_ESCROW_LAUNCH_ENDPOINT;

export function getBackendBase() {
  if (!launchEndpoint) {
    throw new Error('Backend endpoint is not configured');
  }

  return launchEndpoint.replace(/\/campaigns\/launch\/?$/, '');
}

export function getCurrentAuthScope(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  return getAuthScopeForPath(pathname);
}

export async function getFreshBackendAccessToken(forceRefresh = false, scope = getCurrentAuthScope()) {
  const supabase = requireSupabase(scope);
  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw new Error(error.message || 'Could not refresh current session.');
    return data.session?.access_token || null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message || 'Could not read current session.');
  const session = data.session;
  if (!session) return null;

  const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
  if (expiresAtMs && expiresAtMs <= Date.now() + 60_000) {
    return getFreshBackendAccessToken(true, scope);
  }

  return session.access_token || null;
}

function backendUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${getBackendBase()}${pathOrUrl}`;
}

function buildBackendHeaders(options: RequestInit, accessToken: string | null) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return headers;
}

function applyAuthScopeHeader(headers: Headers, scope: string) {
  headers.set('X-App-Session-Scope', scope);
  return headers;
}

async function isInvalidSessionResponse(response: Response) {
  if (response.status !== 401) return false;
  const body = await response.clone().json().catch(() => null);
  return body?.error === 'Invalid session';
}

export async function backendFetch(pathOrUrl: string, options: RequestInit = {}, scope = getCurrentAuthScope()) {
  let accessToken = await getFreshBackendAccessToken(false, scope);
  const requestOptions = {
    ...options,
    credentials: 'include' as RequestCredentials,
    headers: applyAuthScopeHeader(buildBackendHeaders(options, accessToken), scope)
  };
  const response = await fetch(backendUrl(pathOrUrl), requestOptions);

  if (accessToken && await isInvalidSessionResponse(response)) {
    accessToken = await getFreshBackendAccessToken(true, scope);
    if (accessToken) {
      return fetch(backendUrl(pathOrUrl), {
        ...options,
        credentials: 'include',
        headers: applyAuthScopeHeader(buildBackendHeaders(options, accessToken), scope)
      });
    }
  }

  return response;
}

export async function createAppSession(accessToken: string, scope = getCurrentAuthScope()) {
  if (!accessToken) throw new Error('Missing access token');

  const response = await fetch(`${getBackendBase()}/auth/session`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-App-Session-Scope': scope
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Could not create app session');
  }
  return body;
}

export async function destroyAppSession(scope = getCurrentAuthScope()) {
  const response = await backendFetch('/auth/logout', { method: 'POST' }, scope);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Could not end app session');
  }
}
