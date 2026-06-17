const launchEndpoint = import.meta.env.VITE_ESCROW_LAUNCH_ENDPOINT;

export function getBackendBase() {
  if (!launchEndpoint) {
    throw new Error('Backend endpoint is not configured');
  }

  return launchEndpoint.replace(/\/campaigns\/launch\/?$/, '');
}

export async function createAppSession(accessToken: string) {
  if (!accessToken) throw new Error('Missing access token');

  const response = await fetch(`${getBackendBase()}/auth/session`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Could not create app session');
  }
  return body;
}

export async function destroyAppSession() {
  const response = await fetch(`${getBackendBase()}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Could not end app session');
  }
}
