'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from './AuthGate';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import PlatformSelector from './PlatformSelector';
import SocialPostCard from './SocialPostCard';
import { apiFetch } from '../lib/proxima-api';

const limits = { twitter: 280, linkedin: 3000, facebook: 63206, whatsapp: 4096 };
const sampleImages = [
  { id: 'sample:hero', title: 'Approved action', category: 'Brand story', src: '/social-gallery/hero.png' },
  { id: 'sample:social', title: 'Social publishing', category: 'Social campaign', src: '/social-gallery/social-campaign.png' },
  { id: 'sample:research', title: 'Research to action', category: 'Research', src: '/social-gallery/research.png' },
  { id: 'sample:meeting', title: 'Prepared meetings', category: 'Meetings', src: '/social-gallery/meeting.png' },
  { id: 'sample:drafting', title: 'First idea to draft', category: 'Writing', src: '/social-gallery/drafting.png' },
  { id: 'sample:workflow', title: 'Campaign plan', category: 'Planning', src: '/social-gallery/workflow-vertical.png' },
  { id: 'sample:approved', title: 'Ready for review', category: 'Approval', src: '/social-gallery/workflow-approved.png' },
];

const labelFor = (platform) => platform === 'twitter' ? 'Twitter / X' : platform === 'whatsapp' ? 'WhatsApp Business' : platform[0].toUpperCase() + platform.slice(1);
const statusFor = (status) => String(status || '').replace(/_/g, ' ');

function Composer() {
  const [goal, setGoal] = useState('Launch our product on all social channels');
  const [platforms, setPlatforms] = useState(Object.keys(limits));
  const [withImage, setWithImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('A clean, futuristic launch image for Proxima v2, deep-space background, cyan and purple light');
  const [drafts, setDrafts] = useState({});
  const [draftSource, setDraftSource] = useState('');
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [whatsappRecipient, setWhatsappRecipient] = useState('');
  const [posts, setPosts] = useState([]);
  const [toolState, setToolState] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [accountIds, setAccountIds] = useState({});

  const loadCampaignState = async () => {
    try {
      const [tools, savedPosts, connectedAccounts] = await Promise.all([apiFetch('/api/tools'), apiFetch('/api/social/posts'), apiFetch('/api/social/accounts')]);
      const readiness = Object.fromEntries((tools.items || []).map((tool) => [tool.name, tool.connected || (!tool.connectionRequired && tool.configured)]));
      setToolState(readiness);
      setPosts(savedPosts.items || []);
      setAccounts(connectedAccounts.items || []);
    } catch (error) { setMessage(error.message || 'Could not load campaign status.'); }
  };

  useEffect(() => { loadCampaignState(); }, []);

  const unreadyPlatforms = useMemo(() => platforms.filter((platform) => !toolState[platform]), [platforms, toolState]);
  const selectSample = (sample) => {
    setImage({ id: sample.id, url: sample.src, filename: sample.title, source: 'sample' });
    setMessage(`${sample.title} selected from the sample gallery.`);
  };

  const generate = async () => {
    setBusy(true); setMessage('');
    try {
      const result = await apiFetch('/api/social/draft', { method: 'POST', body: JSON.stringify({ goal, platforms, generate_image: withImage && !image, image_prompt: imagePrompt }) });
      setDrafts(result.drafts || {});
      setDraftSource(result.source || 'template');
      if (result.image) setImage(result.image);
      setMessage(result.imageError || (result.source === 'openai' ? 'AI-generated drafts are ready to review and edit.' : 'Draft templates are ready. Add OPENAI_API_KEY to generate campaign copy with AI.'));
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const upload = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setMessage('');
    try {
      const form = new FormData(); form.append('file', file);
      const token = window.localStorage.getItem('proxima_token');
      const response = await fetch('/api/social/upload', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
      const result = await response.json(); if (!response.ok) throw new Error(result.detail || result.error || 'Upload failed.');
      setImage(result);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const saveCampaign = async () => {
    if (unreadyPlatforms.length) {
      setMessage(`Connect ${unreadyPlatforms.map(labelFor).join(', ')} in Integrations before publishing.`);
      return;
    }
    if (platforms.includes('whatsapp') && !whatsappRecipient.trim()) {
      setMessage('Add an opted-in WhatsApp recipient before scheduling or publishing a WhatsApp Business message.');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const post = await apiFetch('/api/social/publish', {
        method: 'POST',
        body: JSON.stringify({
          content: drafts, platforms, image_id: image?.source === 'sample' ? null : image?.id, image_url: image?.url || null,
          scheduled_for: scheduledFor || null, schedule_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          whatsapp_recipient: whatsappRecipient.trim() || null, account_ids: accountIds,
        }),
      });
      setPosts((current) => [post, ...current]);
      setMessage(post.status === 'scheduled' ? 'Campaign scheduled. Proxima will dispatch it at the selected time and record every provider result.' : 'Campaign saved for approval. Review it below, then publish when ready.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const approve = async (postId) => {
    setBusy(true); setMessage('');
    try {
      const post = await apiFetch(`/api/social/${postId}/approve`, { method: 'POST', body: '{}' });
      setPosts((current) => current.map((item) => item.id === post.id ? post : item));
      setMessage(post.status === 'published' ? 'Campaign sent successfully.' : 'Publishing finished with one or more provider errors. See the campaign activity below.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  return <><div className="bg-grid" /><main className="shell"><Navbar title="Campaigns" /><div className="workspace-page"><Sidebar /><section className="panel page-content"><p className="eyebrow">Campaign workspace</p><h1>Prepare your next campaign</h1><p className="lede">Create channel-specific copy, review it, and either approve it now or schedule it. Every attempted delivery is saved with its provider result.</p><label className="field"><span>What do you want this campaign to accomplish?</span><textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} /></label><PlatformSelector selected={platforms} onChange={setPlatforms} readiness={toolState} /><div className="campaign-account-picker">{platforms.filter((platform) => accounts.filter((account) => account.platform === platform).length > 1).map((platform) => <label className="field" key={platform}><span>Post to which {labelFor(platform)} account?</span><select value={accountIds[platform] || ''} onChange={(event) => setAccountIds((current) => ({ ...current, [platform]: event.target.value }))}><option value="">First connected account</option>{accounts.filter((account) => account.platform === platform).map((account, index) => <option key={account.id} value={account.id}>{account.label} {index + 1}</option>)}</select></label>)}</div><section className="sample-gallery" aria-label="Proxima sample image gallery"><div className="sample-gallery-header"><div><p className="eyebrow">Image ideas</p><h2>Choose a campaign image</h2></div><span className="muted">Use one when you do not have an upload yet.</span></div><div className="sample-gallery-grid">{sampleImages.map((sample) => <button type="button" key={sample.id} className={`sample-image-card ${image?.id === sample.id ? 'selected' : ''}`} onClick={() => selectSample(sample)}><img src={sample.src} alt={sample.title} loading="lazy" /><span className="sample-image-meta"><strong>{sample.title}</strong><small>{sample.category}</small></span></button>)}</div></section><div className="social-controls"><label><input type="checkbox" checked={withImage} onChange={(event) => setWithImage(event.target.checked)} /> Create an image from a description</label><label className="field"><span>Describe the image</span><input value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} disabled={!withImage} /></label><label className="ghost upload-control">Upload image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden /></label>{image ? <button type="button" className="ghost" onClick={() => setImage(null)}>Remove selected image</button> : null}</div>{platforms.includes('whatsapp') ? <label className="field whatsapp-recipient"><span>WhatsApp recipient</span><input value={whatsappRecipient} onChange={(event) => setWhatsappRecipient(event.target.value)} placeholder="Country code and number, e.g. 2348012345678" /><small>WhatsApp Business sends a direct message, not a public social post. The recipient must have opted in.</small></label> : null}<div className="action-row"><button className="primary" disabled={busy || !goal.trim() || !platforms.length} onClick={generate}>Generate campaign with AI</button><label className="field schedule-field"><span>Optional schedule</span><input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /></label><button className="secondary" disabled={busy || !Object.keys(drafts).length} onClick={saveCampaign}>{scheduledFor ? 'Approve & schedule' : 'Save for approval'}</button></div>{unreadyPlatforms.length ? <p className="connection-message">Before publishing, connect: {unreadyPlatforms.map(labelFor).join(', ')}.</p> : null}{message ? <p className="connection-message">{message}</p> : null}<section className="campaign-drafts"><div className="campaign-section-head"><div><p className="eyebrow">Content preview</p><h2>{draftSource === 'openai' ? 'AI-generated campaign drafts' : 'Campaign drafts'}</h2></div><span className="muted">Edit every post before approval.</span></div>{Object.keys(drafts).length ? <div className="social-hub-grid">{Object.entries(drafts).map(([platform, text]) => <SocialPostCard key={platform} platform={platform} text={text} limit={limits[platform]} image={image} onChange={(key, value) => setDrafts((current) => ({ ...current, [key]: value }))} />)}</div> : <p className="muted">Describe your campaign and choose “Generate campaign with AI” to create editable channel-specific posts.</p>}</section><section className="campaign-activity"><div className="campaign-section-head"><div><p className="eyebrow">Campaign activity</p><h2>Saved, scheduled, and published posts</h2></div><span className="muted">{posts.length} saved</span></div>{posts.length ? <div className="campaign-post-list">{posts.map((post) => <article className="campaign-post" key={post.id}><div><strong>{post.platforms.map(labelFor).join(' · ')}</strong><span className={`campaign-status ${post.status}`}>{statusFor(post.status)}</span><p>{post.scheduledFor ? `Scheduled for ${new Date(post.scheduledFor).toLocaleString()}` : 'Ready for your approval'}</p></div>{post.status === 'awaiting_approval' ? <button className="primary" disabled={busy} onClick={() => approve(post.id)}>Approve & publish now</button> : null}{Object.entries(post.results || {}).map(([platform, result]) => <p className={result.status === 'published' ? 'delivery-success' : 'delivery-error'} key={platform}>{labelFor(platform)}: {result.status === 'published' ? 'Published' : result.error || 'Failed'}{result.warning ? ` — ${result.warning}` : ''}</p>)}</article>)}</div> : <p className="muted">No campaign posts have been saved yet.</p>}</section></section></div></main></>;
}

export default function SocialHub() { return <AuthGate><Composer /></AuthGate>; }
