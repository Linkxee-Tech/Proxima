async function readPayload(response) {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  return isJson ? response.json().catch(() => ({})) : response.text();
}

export async function apiFetch(path, options = {}, allowRefresh = true) {
  const token = typeof window === 'undefined' ? '' : window.localStorage.getItem('proxima_token');
  const { headers: optionHeaders, ...requestOptions } = options;
  const response = await fetch(path, {
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(optionHeaders || {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401 && allowRefresh && !path.includes('/auth/')) {
    const refreshToken = typeof window === 'undefined' ? '' : window.localStorage.getItem('proxima_refresh_token');
    if (refreshToken) {
      const refreshed = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }), cache: 'no-store' });
      if (refreshed.ok) {
        const payload = await readPayload(refreshed);
        if (payload.token) window.localStorage.setItem('proxima_token', payload.token);
        if (payload.refreshToken) window.localStorage.setItem('proxima_refresh_token', payload.refreshToken);
        return apiFetch(path, options, false);
      }
    }
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    const message = typeof payload === 'object' && payload ? payload.error || payload.message || payload.detail : payload;
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return payload;
}
