'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGate from './AuthGate';
import Icon from './Icon';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { apiFetch } from '../lib/proxima-api';

function Preferences() {
  const [theme, setTheme] = useState('dark');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('proxima_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
    apiFetch('/api/auth/me').then((result) => setEmail(result.user?.email || '')).catch((error) => setMessage(error.message));
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.localStorage.setItem('proxima_theme', next);
    document.documentElement.dataset.theme = next;
  };

  return <><div className="bg-grid" /><main className="shell"><Navbar title="Settings" /><div className="workspace-page"><Sidebar /><section className="panel page-content"><div className="settings-heading"><div><p className="eyebrow with-icon"><Icon name="settings" size={14} /> Workspace preferences</p><h1>Settings</h1></div></div><p className="lede">Manage your account details, appearance, and sign-in options. Connected services are managed separately under Integrations.</p>{message ? <p className="connection-message"><Icon name="info" size={15} /> {message}</p> : null}<div className="resource-list"><article className="resource-card"><p className="eyebrow">Account</p><strong>{email || 'Loading account…'}</strong><p className="muted">This email is used to sign in to Proxima.</p></article><article className="resource-card"><p className="eyebrow">Appearance</p><strong>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</strong><p className="muted">Choose the workspace appearance that is most comfortable for you.</p><div className="action-row"><button className="secondary with-icon" onClick={toggleTheme}><Icon name={theme === 'dark' ? 'spark' : 'moon'} size={15} /> Use {theme === 'dark' ? 'light' : 'dark'} mode</button></div></article><article className="resource-card"><p className="eyebrow">Security</p><strong>Password reset</strong><p className="muted">Request a one-time email link to choose a new password.</p><div className="action-row"><Link className="secondary with-icon" href="/forgot-password"><Icon name="lock" size={15} /> Reset password</Link></div></article><article className="resource-card"><p className="eyebrow">Connections</p><strong>Connected services</strong><p className="muted">Connect or remove Google, Slack, social platforms, and other external services.</p><div className="action-row"><Link className="primary with-icon" href="/dashboard/integrations"><Icon name="plug" size={15} /> Manage integrations</Link></div></article></div></section></div></main></>;
}

export default function PreferencesPanel() { return <AuthGate><Preferences /></AuthGate>; }
