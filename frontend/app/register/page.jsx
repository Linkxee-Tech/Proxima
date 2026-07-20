'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/proxima-api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password.length < 6 || password.length > 8) return setError('Use 6 to 8 characters for your password.');
    setBusy(true);
    setError('');
    try {
      const result = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('proxima_token', result.token);
      if (result.refreshToken) localStorage.setItem('proxima_refresh_token', result.refreshToken);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-screen">
      <form className="panel auth-card" onSubmit={submit}>
        <Link className="auth-brand" href="/" aria-label="Return to Proxima landing page">
          <Image src="/proxima-command-mark.png" alt="" width={38} height={38} priority />
          <span>PROXIMA</span>
        </Link>
        <p className="eyebrow">Create Proxima account</p>
        <h1>Start with a secure workspace</h1>
        <label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field"><span>Password</span><input type="password" minLength="6" maxLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p className="auth-error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
        <Link className="ghost" href="/login">Already have an account? Sign in</Link>
        <Link className="auth-home-link" href="/">Back to landing page</Link>
      </form>
    </main>
  );
}
