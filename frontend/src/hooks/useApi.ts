const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('docflow_token');
}

export function setToken(token: string) {
  localStorage.setItem('docflow_token', token);
}

export function clearToken() {
  localStorage.removeItem('docflow_token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Request failed');
  }

  return data;
}
