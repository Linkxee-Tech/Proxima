'use client';

import { useEffect, useState } from 'react';
import AuthGate from './AuthGate';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PlatformSelector from './PlatformSelector';
import { apiFetch } from '../lib/proxima-api';

const platformName = (platform) => ({
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook Pages',
  whatsapp: 'WhatsApp Business',
}[platform] || platform);

const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Not available';

function deliverySummary(results) {
  if (!results || !Object.keys(results).length) return 'Delivery has not run yet.';
  return Object.entries(results).map(([platform, result]) => {
    const detail = result.error || result.providerId || 'No provider details';
    return `${platformName(platform)}: ${result.status || 'unknown'} - ${detail}`;
  });
}

export default function RecurringCampaigns() {
  const [topic, setTopic] = useState('Cyber security');
  const [platforms, setPlatforms] = useState(['twitter']);
  const [cadence, setCadence] = useState('daily');
  const [scheduledFor, setScheduledFor] = useState('');
  const [whatsappRecipient, setWhatsappRecipient] = useState('');
  const [accountIds, setAccountIds] = useState({});
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [readiness, setReadiness] = useState({});
  const [expanded, setExpanded] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async ({ quiet = false } = {}) => {
    try {
      const [campaigns, tools, socialAccounts] = await Promise.all([
        apiFetch('/api/social/recurring'),
        apiFetch('/api/tools'),
        apiFetch('/api/social/accounts'),
      ]);
      setItems(campaigns.items || []);
      setAccounts(socialAccounts.items || []);
      setReadiness(Object.fromEntries((tools.items || []).map((tool) => [
        tool.name,
        tool.connected || (!tool.connectionRequired && tool.configured),
      ])));
    } catch (error) {
      if (!quiet) setMessage(error.message);
    }
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load({ quiet: true }), 15000);
    return () => window.clearInterval(interval);
  }, []);

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const campaign = await apiFetch('/api/social/recurring', {
        method: 'POST',
        body: JSON.stringify({
          topic,
          platforms,
          cadence,
          account_ids: accountIds,
          whatsapp_recipient: whatsappRecipient.trim() || null,
          scheduled_for: scheduledFor || null,
          schedule_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }),
      });
      setItems((current) => [...current, { ...campaign, recentPosts: [], upcomingAngles: campaign.subtopics || [] }]);
      setMessage('The series is active. Review each generated post below and stop the series before its next run if the content is not right.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const stop = async (id) => {
    setBusy(true);
    setMessage('');
    try {
      const campaign = await apiFetch(`/api/social/recurring/${id}/stop`, { method: 'POST', body: '{}' });
      setItems((current) => current.map((item) => item.id === id ? { ...item, ...campaign } : item));
      setMessage('The recurring series has been stopped. Posts already sent cannot be recalled.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const accountsFor = (platform) => accounts.filter((account) => account.platform === platform);

  return <AuthGate><div className="bg-grid" /><main className="shell"><Navbar title="Recurring campaigns" /><div className="workspace-page"><Sidebar /><section className="panel page-content">
    <p className="eyebrow">Automatic publishing</p>
    <h1>Keep a topic moving</h1>
    <p className="lede">Choose a topic and cadence. Proxima breaks it into useful angles, drafts each channel-specific post, and publishes while the series is active. You can inspect every draft and stop the series at any time.</p>
    <form onSubmit={create}>
      <label className="field"><span>Topic</span><textarea rows={3} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Cyber security" /></label>
      <PlatformSelector selected={platforms} onChange={setPlatforms} readiness={readiness} />
      {platforms.map((platform) => {
        const choices = accountsFor(platform);
        if (choices.length < 2) return null;
        return <label className="field account-choice" key={platform}><span>{platformName(platform)} account</span><select value={accountIds[platform] || ''} onChange={(event) => setAccountIds((current) => ({ ...current, [platform]: event.target.value }))}><option value="">Use the default connected account</option>{choices.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</select></label>;
      })}
      {platforms.includes('whatsapp') ? <label className="field whatsapp-recipient"><span>Opted-in WhatsApp recipient</span><input type="tel" value={whatsappRecipient} onChange={(event) => setWhatsappRecipient(event.target.value)} placeholder="+234..." required /><small>Only use a recipient who has opted in to receive WhatsApp Business messages.</small></label> : null}
      <div className="recurring-controls"><label className="field"><span>Post cadence</span><select value={cadence} onChange={(event) => setCadence(event.target.value)}><option value="daily">Once a day</option><option value="weekly">Once a week</option></select></label><label className="field"><span>First post</span><input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /><small>Leave blank to begin on the next scheduler check.</small></label></div>
      <button className="primary" disabled={busy || !topic.trim() || !platforms.length}>{busy ? 'Starting...' : 'Start recurring campaign'}</button>
    </form>
    {message ? <p className="connection-message" role="status">{message}</p> : null}
    <section className="campaign-activity">
      <div className="campaign-section-head"><div><p className="eyebrow">Active series</p><h2>Topics on autopilot</h2><p className="muted">Open a series to review every generated post and its delivery result.</p></div><button type="button" className="secondary" onClick={() => load()} disabled={busy}>Refresh activity</button></div>
      {items.length ? <div className="campaign-post-list">{items.map((item) => <article className="campaign-post" key={item.id}>
        <div><strong>{item.topic}</strong><span className={`campaign-status ${item.status}`}>{item.status}</span><p>{item.status === 'running' ? 'Proxima is drafting and delivering the next post now.' : `${item.cadence} - next post ${formatDate(item.nextRun)} - ${item.runs || 0} posts attempted`}</p></div>
        <p>Upcoming angles: {(item.upcomingAngles || []).join(' - ') || 'All prepared angles have been used.'}</p>
        <div className="campaign-actions"><button type="button" className="secondary" onClick={() => setExpanded((current) => ({ ...current, [item.id]: !current[item.id] }))}>{expanded[item.id] ? 'Hide generated posts' : `Review generated posts (${item.recentPosts?.length || 0})`}</button>{item.status === 'active' ? <button type="button" className="secondary danger-action" disabled={busy} onClick={() => stop(item.id)}>Stop campaign</button> : null}</div>
        {expanded[item.id] ? <section className="recurring-posts"><h3>What this series has generated</h3>{item.recentPosts?.length ? item.recentPosts.map((post) => <article className="recurring-post" key={post.id}><div className="recurring-post-head"><div><strong>{post.subtopic || 'Generated post'}</strong><p>{formatDate(post.createdAt)} - {post.draftSource === 'openai' ? 'OpenAI draft' : 'Template fallback'}</p></div><span className={`campaign-status ${post.status}`}>{post.status}</span></div>{Object.entries(post.content || {}).map(([platform, content]) => <div className="recurring-post-copy" key={platform}><strong>{platformName(platform)}</strong><pre>{content}</pre></div>)}<div className="delivery-results">{deliverySummary(post.results).map((result) => <p key={result}>{result}</p>)}</div></article>) : <p className="muted">Nothing has been generated yet. The first draft will appear here after the scheduler runs.</p>}<p className="muted">Published posts cannot be edited or recalled. Stop the series before its next run if the writing needs to change.</p></section> : null}
      </article>)}</div> : <p className="muted">No recurring campaigns yet.</p>}
    </section>
  </section></div></main></AuthGate>;
}
