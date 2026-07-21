'use client';

import { useEffect, useState } from 'react';
import AuthGate from './AuthGate';
import Icon from './Icon';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { apiFetch } from '../lib/proxima-api';

const socialTools = new Set(['twitter', 'linkedin', 'facebook']);

function ConnectedApps() {
  const [connections, setConnections] = useState([]);
  const [message, setMessage] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [slackText, setSlackText] = useState('');
  const [sendingSlack, setSendingSlack] = useState(false);
  const load = () => apiFetch('/api/integrations').then((integrations) => setConnections(integrations.items)).catch((err) => setMessage(err.message));
  useEffect(() => { load(); const params = new URLSearchParams(window.location.search); setMessage(params.get('connected') ? `${params.get('connected')} connected successfully.` : params.get('error') || ''); }, []);
  const connect = async (tool) => { try { window.location.assign((await apiFetch(`/api/integrations/${tool}/connect`, { method: 'POST', body: '{}' })).authorizationUrl); } catch (err) { setMessage(err.message); } };
  const disconnect = async (tool) => { try { await apiFetch(`/api/integrations/${tool}`, { method: 'DELETE' }); await load(); } catch (err) { setMessage(err.message); } };
  const saveSlackChannel = async () => { try { await apiFetch('/api/tools/slack/notification-channel', { method: 'POST', body: JSON.stringify({ channel: slackChannel }) }); setMessage('Workflow updates will be sent to this Slack channel.'); } catch (error) { setMessage(error.message); } };
  const sendSlack = async (event) => { event.preventDefault(); setSendingSlack(true); setMessage(''); try { await apiFetch('/api/tools/slack/messages', { method: 'POST', body: JSON.stringify({ channel: slackChannel, text: slackText }) }); setSlackText(''); setMessage('Slack message sent.'); } catch (error) { setMessage(error.message); } finally { setSendingSlack(false); } };
  return <><div className="bg-grid" /><main className="shell"><Navbar title="Connected Apps" /><div className="workspace-page"><Sidebar /><section className="panel page-content"><div className="settings-heading"><div><p className="eyebrow with-icon"><Icon name="plug" size={14} /> Apps that work with Proxima</p><h1>Connected Apps</h1></div></div><p className="lede">Connect the accounts you want to use. Add another X, LinkedIn, or Facebook account when a campaign needs a specific account.</p>{message ? <p className="connection-message"><Icon name="info" size={15} /> {message}</p> : null}<div className="connection-grid">{connections.map((item) => <article className="connection-card" key={item.name}><div className="with-icon"><span className="section-icon"><Icon name={item.connected ? 'link' : 'plug'} /></span><div><strong>{item.label}</strong><p className={item.connected ? 'connected' : 'muted'}>{item.connected ? `Connected${item.connectionCount > 1 ? ` (${item.connectionCount} accounts)` : ''}` : item.connectionRequired && item.configured ? 'Ready to connect' : item.connectionRequired ? 'Needs setup' : item.configured ? 'Ready for Proxima' : 'Needs setup'}</p></div></div><div className="action-row">{item.connectionRequired ? item.connected ? <><button className="secondary with-icon" onClick={() => disconnect(item.name)}><Icon name="x" size={15} /> Disconnect all</button>{socialTools.has(item.name) ? <button className="ghost with-icon" onClick={() => connect(item.name)}><Icon name="link" size={15} /> Add account</button> : null}</> : <button className="primary with-icon" disabled={!item.configured} onClick={() => connect(item.name)}><Icon name="link" size={15} /> Connect</button> : <button className="secondary with-icon" disabled><Icon name="lock" size={15} /> Managed by workspace</button>}</div>{item.name === 'slack' && item.connected ? <form className="slack-message-form" onSubmit={sendSlack}><label className="field"><span>Channel ID</span><input value={slackChannel} onChange={(event) => setSlackChannel(event.target.value)} placeholder="C0123456789" required /></label><label className="field"><span>Message</span><textarea value={slackText} onChange={(event) => setSlackText(event.target.value)} rows={3} maxLength={40000} required /></label><div className="action-row"><button type="button" className="secondary with-icon" disabled={!slackChannel.trim()} onClick={saveSlackChannel}><Icon name="bell" size={15} /> Use for workflow updates</button><button className="primary with-icon" disabled={sendingSlack || !slackChannel.trim() || !slackText.trim()}><Icon name="send" size={15} /> {sendingSlack ? 'Sending…' : 'Send Slack message'}</button></div><p className="muted">Save a channel to receive work updates. The Proxima app must be a member of that channel.</p></form> : null}</article>)}</div></section></div></main></>;
}

export default function SettingsPanel() { return <AuthGate><ConnectedApps /></AuthGate>; }
