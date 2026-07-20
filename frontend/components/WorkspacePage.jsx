'use client';

import { useCallback, useEffect, useState } from 'react';
import AuthGate from './AuthGate';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ApprovalModal from './ApprovalModal';
import ApprovalCard from './ApprovalCard';
import { Dialog } from './ui/Dialog';
import { apiFetch } from '../lib/proxima-api';

const copy = {
  approvals: { title: 'Needs Your Approval', eyebrow: 'Your decision is needed', description: 'Review what is ready before Proxima continues.' },
  memory: { title: 'Things I’ve Learned', eyebrow: 'Knowledge', description: 'Useful preferences and context Proxima can use to make your work easier.' },
  history: { title: 'Activity', eyebrow: 'Your recent work', description: 'Finished, cancelled, and unsuccessful requests in one place.' },
  work: { title: 'My Work', eyebrow: 'Everything in one place', description: 'See what is moving, what is saved for later, and what is already finished.' },
  drafts: { title: 'Drafts', eyebrow: 'Not started yet', description: 'Requests that have been saved but have not started.' },
};

function statusLabel(item) {
  const labels = { waiting_approval: 'Needs your approval', running: 'Working now', completed: 'Finished', failed: 'Could not finish', cancelled: 'Cancelled', queued: 'Getting ready', deferred: 'Saved for later', draft: 'Draft' };
  return labels[item.status] || item.metadata?.action || 'Saved context';
}

function timeLabel(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function dayLabel(value) {
  const date = new Date(value || Date.now());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const target = new Date(date); target.setHours(0, 0, 0, 0);
  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupByDay(items) {
  return items.reduce((groups, item) => {
    const label = dayLabel(item.updatedAt || item.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
    return groups;
  }, {});
}

function Inner({ kind }) {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [memoryEditor, setMemoryEditor] = useState(null);
  const [approvalToReview, setApprovalToReview] = useState(null);
  const load = useCallback(async () => {
    try {
      const result = kind === 'memory' ? await apiFetch('/api/memory/search?q=') : await apiFetch('/api/workflows');
      setData(result.items || []); setError('');
    } catch (err) { setError(err.message); }
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  const sorted = [...data].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  const visible = kind === 'approvals' ? sorted.filter((item) => item.status === 'waiting_approval')
    : kind === 'history' ? sorted.filter((item) => ['completed', 'failed', 'cancelled'].includes(item.status))
      : kind === 'drafts' ? sorted.filter((item) => item.status === 'draft') : sorted;

  const openMemoryEditor = (item, mode) => { setError(''); setMemoryEditor({ item, mode, text: mode === 'edit' ? item.text || '' : '' }); };
  const saveMemory = async (event) => {
    event.preventDefault(); const text = memoryEditor?.text?.trim() || '';
    if (!memoryEditor || !text) { setError('Enter something before saving.'); return; }
    const id = memoryEditor.item?.id || 'new-memory'; setBusyId(id); setError('');
    try {
      if (memoryEditor.mode === 'edit') await apiFetch(`/api/memory/${memoryEditor.item.id}`, { method: 'PATCH', body: JSON.stringify({ text }) });
      else await apiFetch('/api/memory', { method: 'POST', body: JSON.stringify({ text }) });
      setMemoryEditor(null); await load();
    } catch (err) { setError(err.message); } finally { setBusyId(''); }
  };
  const act = async (item, action) => {
    if (action === 'add' || action === 'edit') { openMemoryEditor(item, action); return; }
    setBusyId(item.id); setError('');
    try {
      if (action === 'delete') await apiFetch(`/api/memory/${item.id}`, { method: 'DELETE' });
      else if (action === 'rerun') await apiFetch(`/api/workflows/${item.id}/rerun`, { method: 'POST', body: '{}' });
      else if (action === 'start') await apiFetch(`/api/workflows/${item.id}/start`, { method: 'POST', body: '{}' });
      else await apiFetch(`/api/workflows/${item.id}/approve`, { method: 'POST', body: JSON.stringify({ all: Boolean(item.socialDrafts) }) });
      await load();
    } catch (err) { setError(err.message); } finally { setBusyId(''); }
  };
  const cancelWork = async (item) => {
    setBusyId(item.id); setError('');
    try { await apiFetch(`/api/workflows/${item.id}/cancel`, { method: 'POST', body: '{}' }); setApprovalToReview(null); await load(); }
    catch (err) { setError(err.message); } finally { setBusyId(''); }
  };
  const deferApproval = async (item) => {
    const step = item.steps?.find((candidate) => candidate.isApprovalGate && candidate.status === 'waiting_approval');
    if (!step) return;
    setBusyId(item.id); setError('');
    try { await apiFetch(`/api/approvals/${item.id}:${step.id}/defer`, { method: 'POST', body: '{}' }); setApprovalToReview(null); await load(); }
    catch (err) { setError(err.message); } finally { setBusyId(''); }
  };
  const resumeApproval = async (item) => {
    const step = item.steps?.find((candidate) => candidate.isApprovalGate && candidate.status === 'deferred');
    if (!step) return;
    setBusyId(item.id); setError('');
    try { const resumed = await apiFetch(`/api/approvals/${item.id}:${step.id}/resume`, { method: 'POST', body: '{}' }); setApprovalToReview(resumed); await load(); }
    catch (err) { setError(err.message); } finally { setBusyId(''); }
  };
  const resolveApproval = async (item, action) => {
    const step = item.steps?.find((candidate) => candidate.isApprovalGate && candidate.status === 'waiting_approval');
    if (!step) return;
    setBusyId(item.id); setError('');
    try { await apiFetch(`/api/approvals/${item.id}:${step.id}/${action}`, { method: 'POST', body: '{}' }); await load(); }
    catch (err) { setError(err.message); } finally { setBusyId(''); }
  };
  const batchResolve = async (action) => {
    const approvalIds = visible.flatMap((item) => (item.steps || []).filter((step) => step.isApprovalGate && step.status === 'waiting_approval').map((step) => `${item.id}:${step.id}`));
    if (!approvalIds.length) return;
    setBusyId('batch'); setError('');
    try { await apiFetch('/api/approvals/batch', { method: 'POST', body: JSON.stringify({ approval_ids: approvalIds, action }) }); await load(); }
    catch (err) { setError(err.message); } finally { setBusyId(''); }
  };
  const renderCard = (item) => <article className="resource-card" key={item.id}><strong>{item.goalText || item.text || item.title || 'Saved information'}</strong><span className="muted">{statusLabel(item)}{kind === 'history' ? ` · ${timeLabel(item.updatedAt || item.createdAt)}` : ''}</span>{kind === 'memory' ? <div className="action-row"><button className="ghost" disabled={busyId === item.id} onClick={() => act(item, 'edit')}>Edit</button><button className="secondary" disabled={busyId === item.id} onClick={() => act(item, 'delete')}>Forget</button></div> : null}{kind === 'drafts' ? <button className="primary" disabled={busyId === item.id} onClick={() => act(item, 'start')}>Start this work</button> : null}{item.status === 'deferred' ? <button className="primary" disabled={busyId === item.id} onClick={() => resumeApproval(item)}>Review now</button> : null}{kind === 'history' ? <button className="ghost" disabled={busyId === item.id} onClick={() => act(item, 'rerun')}>Do this again</button> : null}{kind === 'approvals' ? <button className="primary" disabled={busyId === item.id} onClick={() => setApprovalToReview(item)}>Review</button> : null}</article>;
  const renderEmpty = (text) => <div className="details-empty compact">{text}</div>;
  const renderWork = () => {
    const groups = [
      ['In progress', sorted.filter((item) => ['running', 'queued', 'waiting_approval'].includes(item.status)), 'Nothing is in progress right now.'],
      ['Drafts', sorted.filter((item) => item.status === 'draft'), 'No drafts have been saved yet.'],
      ['Saved for later', sorted.filter((item) => item.status === 'deferred'), 'Nothing has been deferred.'],
      ['Completed', sorted.filter((item) => item.status === 'completed'), 'No completed work yet.'],
    ];
    return groups.map(([title, items, empty]) => <section className="work-group" key={title}><h2>{title}</h2><div className="resource-list">{items.length ? items.map(renderCard) : renderEmpty(empty)}</div></section>);
  };
  const renderActivity = () => {
    const groups = groupByDay(visible);
    return visible.length ? Object.entries(groups).map(([label, items]) => <section className="activity-group" key={label}><h2>{label}</h2><div className="resource-list">{items.map(renderCard)}</div></section>) : renderEmpty('No completed activity yet.');
  };
  const page = copy[kind];

  return <><div className="bg-grid" /><main className="shell"><Navbar title={page.title} /><div className="workspace-page"><Sidebar /><section className="panel page-content"><p className="eyebrow">{page.eyebrow}</p><h1>{page.title}</h1><p className="lede">{page.description}</p>{kind === 'memory' ? <button className="primary" onClick={() => act({ id: 'new-memory' }, 'add')}>Add something to remember</button> : null}{error ? <p className="auth-error">{error}</p> : null}<div className={kind === 'work' || kind === 'history' ? 'grouped-resources' : 'resource-list'}>{kind === 'work' ? renderWork() : kind === 'history' ? renderActivity() : visible.length ? visible.map(renderCard) : renderEmpty('Nothing to show here yet.')}</div></section></div><Dialog open={Boolean(memoryEditor)} onClose={() => setMemoryEditor(null)}><form onSubmit={saveMemory}><div className="modal-header"><p className="eyebrow">Knowledge</p><h2>{memoryEditor?.mode === 'edit' ? 'Edit saved information' : 'Add something to remember'}</h2></div><div className="modal-body"><p className="modal-copy">Save a preference, writing style, or other context you want Proxima to use in future work.</p><label className="field"><span>Information to remember</span><textarea rows={5} value={memoryEditor?.text || ''} onChange={(event) => setMemoryEditor((current) => current ? { ...current, text: event.target.value } : current)} placeholder="Example: Keep launch posts concise and confident." autoFocus /></label></div><div className="modal-actions action-row"><button type="button" className="secondary" onClick={() => setMemoryEditor(null)}>Cancel</button><button type="submit" className="primary" disabled={busyId === (memoryEditor?.item?.id || 'new-memory')}>{memoryEditor?.mode === 'edit' ? 'Save changes' : 'Save this'}</button></div></form></Dialog><ApprovalModal workflow={approvalToReview} onClose={() => setApprovalToReview(null)} onApprove={() => approvalToReview && act(approvalToReview, 'approve').then(() => setApprovalToReview(null))} onDefer={() => approvalToReview && deferApproval(approvalToReview)} onCancel={() => approvalToReview && cancelWork(approvalToReview)} /></main></>;
}

export default function WorkspacePage({ kind }) { return <AuthGate><Inner kind={kind} /></AuthGate>; }
