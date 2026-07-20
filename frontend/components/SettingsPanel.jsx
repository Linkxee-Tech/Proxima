'use client';

import { useEffect, useState } from 'react';
import AuthGate from './AuthGate';
import Icon from './Icon';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { apiFetch } from '../lib/proxima-api';

function Settings() {
  const [connections, setConnections] = useState([]); const [message, setMessage] = useState('');
  const load = () => apiFetch('/api/integrations').then((integrations) => setConnections(integrations.items)).catch((err) => setMessage(err.message));
  useEffect(() => { load(); const params = new URLSearchParams(window.location.search); setMessage(params.get('connected') ? `${params.get('connected')} connected successfully.` : params.get('error') || ''); }, []);
  const connect = async (tool) => { try { window.location.assign((await apiFetch(`/api/integrations/${tool}/connect`, { method: 'POST', body: '{}' })).authorizationUrl); } catch (err) { setMessage(err.message); } };
  const disconnect = async (tool) => { try { await apiFetch(`/api/integrations/${tool}`, { method: 'DELETE' }); await load(); } catch (err) { setMessage(err.message); } };
  return <><div className="bg-grid" /><main className="shell"><Navbar title="Integrations" /><div className="workspace-page"><Sidebar /><section className="panel page-content"><div className="settings-heading"><div><p className="eyebrow with-icon"><Icon name="plug" size={14} /> Connected services</p><h1>Integrations</h1></div></div><p className="lede">“Configured” means the server has provider credentials. Only “Connected” confirms that you completed the provider&apos;s OAuth approval successfully.</p>{message ? <p className="connection-message"><Icon name="info" size={15} /> {message}</p> : null}<div className="connection-grid">{connections.map((item) => <article className="connection-card" key={item.name}><div className="with-icon"><span className="section-icon"><Icon name={item.connected ? 'link' : 'plug'} /></span><div><strong>{item.label}</strong><p className={item.connected ? 'connected' : 'muted'}>{item.connected ? 'Connected' : item.connectionRequired && item.configured ? 'OAuth configured — not connected' : item.connectionRequired ? 'Credentials required' : item.configured ? 'Server credentials configured' : 'Credentials required'}</p></div></div><div className="action-row">{item.connectionRequired ? item.connected ? <button className="secondary with-icon" onClick={() => disconnect(item.name)}><Icon name="x" size={15} /> Disconnect</button> : <button className="primary with-icon" disabled={!item.configured} onClick={() => connect(item.name)}><Icon name="link" size={15} /> Connect OAuth</button> : <button className="secondary with-icon" disabled><Icon name="lock" size={15} /> Server-managed</button>}</div></article>)}</div></section></div></main></>;
}
export default function SettingsPanel() { return <AuthGate><Settings /></AuthGate>; }
