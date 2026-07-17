'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/proxima-api';
import Link from 'next/link';

export default function AuthGate({ children, forcePrompt = false, redirectTo = '' }) {
  const [state, setState] = useState({ loading: true, error: '', mode: 'login' });

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(() => setState({ loading: false, error: '', mode: 'login' }))
      .catch(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState((current) => ({ ...current, error: '' }));
    try {
      const response = await fetch(`/api/auth/${state.mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to authenticate.');
      window.localStorage.setItem('proxima_token', payload.token);
      if (payload.refreshToken) window.localStorage.setItem('proxima_refresh_token', payload.refreshToken);
      if (redirectTo) { window.location.assign(redirectTo); return; }
      setState({ loading: false, error: '', mode: 'login' });
    } catch (error) { setState((current) => ({ ...current, error: error.message })); }
  };

  if (state.loading) return <main className="auth-screen"><p>Connecting to Proxima...</p></main>;
  if (typeof window !== 'undefined' && (window.localStorage.getItem('proxima_token') || (!forcePrompt && !state.error))) return children;
  return (
    <main className="auth-screen">
      <form className="auth-card panel" onSubmit={submit}>
        <p className="eyebrow">Secure workspace</p><h1>Proxima</h1>
        <p className="lede">{state.mode === 'login' ? 'Sign in to access your workflows.' : 'Create a private workspace.'}</p>
        <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
        <label className="field"><span>Password</span><input name="password" type="password" autoComplete={state.mode === 'login' ? 'current-password' : 'new-password'} minLength="10" required /></label>
        {state.error ? <p className="auth-error">{state.error}</p> : null}
        <button className="primary" type="submit">{state.mode === 'login' ? 'Sign in' : 'Create account'}</button>
        {state.mode === 'login' ? <Link className="auth-link" href="/forgot-password">Forgot password?</Link> : null}
        <button className="ghost" type="button" onClick={() => setState((current) => ({ ...current, mode: current.mode === 'login' ? 'register' : 'login', error: '' }))}>{state.mode === 'login' ? 'Create an account' : 'I already have an account'}</button>
      </form>
    </main>
  );
}
