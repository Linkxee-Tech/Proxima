export async function apiFetch(path, options = {}) {
  const token = typeof window === 'undefined' ? '' : window.localStorage.getItem('proxima_token');
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
    ...options,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => ({})) : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload ? payload.error || payload.message || payload.detail : payload;
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return payload;
}
