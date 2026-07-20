'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../lib/proxima-api';

export default function ResetPasswordPage() {
  const params = useSearchParams(); const router = useRouter(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event) => { event.preventDefault(); if (password !== confirm) return setError('Passwords do not match.'); if (password.length < 6 || password.length > 8) return setError('Use 6 to 8 characters for your password.'); setBusy(true); setError(''); try { const result = await apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: params.get('token') || '', password }) }); localStorage.setItem('proxima_token', result.token); if (result.refreshToken) localStorage.setItem('proxima_refresh_token', result.refreshToken); router.replace('/dashboard'); } catch (err) { setError(err.message || 'This reset link is invalid or expired.'); } finally { setBusy(false); } };
  return <main className="auth-screen"><form className="panel auth-card" onSubmit={submit}><Link className="auth-brand" href="/" aria-label="Return to Proxima landing page"><Image src="/proxima-command-mark.png" alt="" width={38} height={38} priority /><span>PROXIMA</span></Link><p className="eyebrow">Account recovery</p><h1>Choose a new password</h1><p className="lede">Use 6 to 8 characters for your password.</p><label className="field"><span>New password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" maxLength="8" required autoComplete="new-password" /></label><label className="field"><span>Confirm password</span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength="6" maxLength="8" required autoComplete="new-password" /></label>{error ? <p className="auth-error">{error}</p> : null}<button className="primary" type="submit" disabled={busy}>{busy ? 'Updating password...' : 'Update password'}</button><Link className="ghost auth-link" href="/login">Back to sign in</Link><Link className="auth-home-link" href="/">Back to landing page</Link></form></main>;
}
