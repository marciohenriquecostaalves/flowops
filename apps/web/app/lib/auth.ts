const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
let refreshInFlight: Promise<string | null> | null = null;

export async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = refreshAccessTokenInternal();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function refreshAccessTokenInternal() {
  const refreshToken = localStorage.getItem('flowops_refresh_token');
  if (!refreshToken) return null;

  const response = await fetch(`${API}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;

  const data = await response.json();
  localStorage.setItem('flowops_access_token', data.accessToken);
  localStorage.setItem('flowops_refresh_token', data.refreshToken);
  return data.accessToken as string;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = localStorage.getItem('flowops_access_token');
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response = await fetch(input, { ...init, headers });
  if (response.status !== 401) return response;

  const nextToken = await refreshAccessToken();
  if (!nextToken) return response;
  headers.set('Authorization', `Bearer ${nextToken}`);
  response = await fetch(input, { ...init, headers });
  return response;
}
