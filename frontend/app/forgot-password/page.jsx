'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '../../lib/proxima-api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [resetToken, setResetToken] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); setMessage(''); try { const result = await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); setMessage(result.message); setResetToken(result.resetToken || ''); } catch (err) { setError(err.message || 'Unable to request a reset.'); } finally { setBusy(false); } };
  return <main className="auth-screen"><form className="panel auth-card" onSubmit={submit}><p className="eyebrow">Account recovery</p><h1>Reset your password</h1><p className="lede">Enter your account email and we&apos;ll issue a one-time reset link.</p><label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>{error ? <p className="auth-error">{error}</p> : null}{message ? <p className="auth-success">{message}</p> : null}{resetToken ? <p className="reset-dev-link">Local reset link: <Link href={`/reset-password?token=${encodeURIComponent(resetToken)}`}>continue</Link></p> : null}<button className="primary" type="submit" disabled={busy}>{busy ? 'Issuing reset…' : 'Send reset link'}</button><Link className="ghost auth-link" href="/login">Back to sign in</Link></form></main>;
}
