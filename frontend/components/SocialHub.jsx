'use client';

import { useState } from 'react';
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

function Composer() {
  const [goal, setGoal] = useState('Launch our product on all social channels');
  const [platforms, setPlatforms] = useState(Object.keys(limits));
  const [withImage, setWithImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('A clean, futuristic launch image for Proxima v2, deep-space background, cyan and purple light');
  const [drafts, setDrafts] = useState({});
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');

  const selectSample = (sample) => {
    setImage({ id: sample.id, url: sample.src, filename: sample.title, source: 'sample' });
    setMessage(`${sample.title} selected from the sample gallery.`);
  };

  const generate = async () => {
    setBusy(true); setMessage('');
    try {
      const result = await apiFetch('/api/social/draft', { method: 'POST', body: JSON.stringify({ goal, platforms, generate_image: withImage && !image, image_prompt: imagePrompt }) });
      setDrafts(result.drafts);
      if (result.image) setImage(result.image);
      setMessage(result.imageError || '');
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

  const publish = async () => {
    setBusy(true); setMessage('');
    try {
      const post = await apiFetch('/api/social/publish', { method: 'POST', body: JSON.stringify({ content: drafts, platforms, image_id: image?.source === 'sample' ? null : image?.id, image_url: image?.url || null, scheduled_for: scheduledFor || null }) });
      setMessage(post.status === 'scheduled' ? 'Post scheduled for every selected platform.' : 'Post saved for approval.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  return <><div className="bg-grid" /><main className="shell"><Navbar title="Campaigns" /><div className="workspace-page"><Sidebar /><section className="panel page-content"><p className="eyebrow">Campaign workspace</p><h1>Prepare your next campaign</h1><p className="lede">Draft tailored posts, add an image, and review everything before it is shared. Nothing is published until you approve it.</p><label className="field"><span>What do you want this campaign to accomplish?</span><textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} /></label><PlatformSelector selected={platforms} onChange={setPlatforms} /><section className="sample-gallery" aria-label="Proxima sample image gallery"><div className="sample-gallery-header"><div><p className="eyebrow">Image ideas</p><h2>Choose a campaign image</h2></div><span className="muted">Use one when you do not have an upload yet.</span></div><div className="sample-gallery-grid">{sampleImages.map((sample) => <button type="button" key={sample.id} className={`sample-image-card ${image?.id === sample.id ? 'selected' : ''}`} onClick={() => selectSample(sample)}><img src={sample.src} alt={sample.title} loading="lazy" /><span className="sample-image-meta"><strong>{sample.title}</strong><small>{sample.category}</small></span></button>)}</div></section><div className="social-controls"><label><input type="checkbox" checked={withImage} onChange={(event) => setWithImage(event.target.checked)} /> Create an image from a description</label><label className="field"><span>Describe the image</span><input value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} disabled={!withImage} /></label><label className="ghost upload-control">Upload image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden /></label>{image ? <button type="button" className="ghost" onClick={() => setImage(null)}>Remove selected image</button> : null}</div><div className="action-row"><button className="primary" disabled={busy || !goal.trim() || !platforms.length} onClick={generate}>Prepare campaign</button><label className="field schedule-field"><span>Optional schedule</span><input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /></label><button className="secondary" disabled={busy || !Object.keys(drafts).length} onClick={publish}>{scheduledFor ? 'Schedule selected posts' : 'Send for approval'}</button></div>{message ? <p className="connection-message">{message}</p> : null}<div className="social-hub-grid">{Object.entries(drafts).map(([platform, text]) => <SocialPostCard key={platform} platform={platform} text={text} limit={limits[platform]} image={image} onChange={(key, value) => setDrafts((current) => ({ ...current, [key]: value }))} />)}</div></section></div></main></>;
}

export default function SocialHub() { return <AuthGate><Composer /></AuthGate>; }
