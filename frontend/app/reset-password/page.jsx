'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../lib/proxima-api';

export default function ResetPasswordPage() {
  const params = useSearchParams(); const router = useRouter(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event) => { event.preventDefault(); if (password !== confirm) return setError('Passwords do not match.'); if (password.length < 10) return setError('Use at least 10 characters for your password.'); setBusy(true); setError(''); try { const result = await apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: params.get('token') || '', password }) }); localStorage.setItem('proxima_token', result.token); localStorage.setItem('proxima_refresh_token', result.refreshToken); router.replace('/dashboard'); } catch (err) { setError(err.message || 'This reset link is invalid or expired.'); } finally { setBusy(false); } };
  return <main className="auth-screen"><form className="panel auth-card" onSubmit={submit}><p className="eyebrow">Account recovery</p><h1>Choose a new password</h1><p className="lede">Use a strong password with at least 10 characters.</p><label className="field"><span>New password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="10" required autoComplete="new-password" /></label><label className="field"><span>Confirm password</span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength="10" required autoComplete="new-password" /></label>{error ? <p className="auth-error">{error}</p> : null}<button className="primary" type="submit" disabled={busy}>{busy ? 'Updating password…' : 'Update password'}</button><Link className="ghost auth-link" href="/login">Back to sign in</Link></form></main>;
}
