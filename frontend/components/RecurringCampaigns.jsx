'use client';

import { useEffect, useState } from 'react';
import AuthGate from './AuthGate';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PlatformSelector from './PlatformSelector';
import { apiFetch } from '../lib/proxima-api';

export default function RecurringCampaigns() {
  const [topic, setTopic] = useState('Cyber security');
  const [platforms, setPlatforms] = useState(['twitter']);
  const [cadence, setCadence] = useState('daily');
  const [scheduledFor, setScheduledFor] = useState('');
  const [items, setItems] = useState([]);
  const [readiness, setReadiness] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { try { const [campaigns, tools] = await Promise.all([apiFetch('/api/social/recurring'), apiFetch('/api/tools')]); setItems(campaigns.items || []); setReadiness(Object.fromEntries((tools.items || []).map((tool) => [tool.name, tool.connected || (!tool.connectionRequired && tool.configured)]))); } catch (error) { setMessage(error.message); } };
  useEffect(() => { load(); }, []);
  const create = async (event) => { event.preventDefault(); setBusy(true); setMessage(''); try { const campaign = await apiFetch('/api/social/recurring', { method: 'POST', body: JSON.stringify({ topic, platforms, cadence, scheduled_for: scheduledFor || null, schedule_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }) }); setItems((current) => [...current, campaign]); setMessage('Recurring campaign is active. Proxima will create and publish the next instalment at its scheduled time.'); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const stop = async (id) => { setBusy(true); try { const campaign = await apiFetch(`/api/social/recurring/${id}/stop`, { method: 'POST', body: '{}' }); setItems((current) => current.map((item) => item.id === id ? campaign : item)); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  return <AuthGate><div className="bg-grid" /><main className="shell"><Navbar title="Recurring campaigns" /><div className="workspace-page"><Sidebar /><section className="panel page-content"><p className="eyebrow">Automatic publishing</p><h1>Keep a topic moving</h1><p className="lede">Choose a topic and cadence. Proxima creates a sequence of angles, drafts the next channel-specific post with AI, and posts while the campaign is active. Stop it whenever you want.</p><form onSubmit={create}><label className="field"><span>Topic</span><textarea rows={3} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Cyber security" /></label><PlatformSelector selected={platforms} onChange={setPlatforms} readiness={readiness} /><div className="recurring-controls"><label className="field"><span>Post cadence</span><select value={cadence} onChange={(event) => setCadence(event.target.value)}><option value="daily">Once a day</option><option value="weekly">Once a week</option></select></label><label className="field"><span>First post</span><input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /><small>Leave blank to begin on the next scheduler check.</small></label></div><button className="primary" disabled={busy || !topic.trim() || !platforms.length}>{busy ? 'Starting…' : 'Start recurring campaign'}</button></form>{message ? <p className="connection-message">{message}</p> : null}<section className="campaign-activity"><div className="campaign-section-head"><div><p className="eyebrow">Active series</p><h2>Topics on autopilot</h2></div><span className="muted">{items.filter((item) => item.status === 'active').length} active</span></div>{items.length ? <div className="campaign-post-list">{items.map((item) => <article className="campaign-post" key={item.id}><div><strong>{item.topic}</strong><span className={`campaign-status ${item.status}`}>{item.status}</span><p>{item.cadence} · next post {new Date(item.nextRun).toLocaleString()} · {item.runs || 0} posts attempted</p></div><p>Upcoming angles: {(item.subtopics || []).slice(item.cursor || 0, (item.cursor || 0) + 3).join(' · ')}</p>{item.status === 'active' ? <button className="secondary" disabled={busy} onClick={() => stop(item.id)}>Stop campaign</button> : null}</article>)}</div> : <p className="muted">No recurring campaigns yet.</p>}</section></section></div></main></AuthGate>;
}
