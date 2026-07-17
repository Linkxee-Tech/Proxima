'use client';

import { useCallback, useEffect, useState } from 'react';
import AuthGate from './AuthGate';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Dialog } from './ui/Dialog';
import { apiFetch } from '../lib/proxima-api';

const copy = {
  approvals: { title: 'Approval Center', eyebrow: 'Human in the loop', description: 'Actions paused for explicit human review.' },
  memory: { title: 'Memory Vault', eyebrow: 'Memory mesh', description: 'Saved brand voice, preferences, and workflow context.' },
  history: { title: 'Workflow History', eyebrow: 'Workflow archive', description: 'Completed, failed, and cancelled workflow runs.' },
};

function Inner({ kind }) {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [memoryEditor, setMemoryEditor] = useState(null);
  const load = useCallback(async () => {
    try {
      const result = kind === 'memory' ? await apiFetch('/api/memory/search?q=') : await apiFetch('/api/workflows');
      setData(result.items || []); setError('');
    } catch (err) { setError(err.message); }
  }, [kind]);
  useEffect(() => { load(); }, [load]);
  const visible = kind === 'approvals' ? data.filter((item) => item.status === 'waiting_approval') : kind === 'history' ? data.filter((item) => ['completed', 'failed', 'cancelled'].includes(item.status)) : data;
  const openMemoryEditor = (item, mode) => {
    setError('');
    setMemoryEditor({ item, mode, text: mode === 'edit' ? item.text || '' : '' });
  };
  const saveMemory = async (event) => {
    event.preventDefault();
    const text = memoryEditor?.text?.trim() || '';
    if (!memoryEditor || !text) {
      setError('Enter some memory before saving.');
      return;
    }
    const id = memoryEditor.item?.id || 'new-memory';
    setBusyId(id); setError('');
    try {
      if (memoryEditor.mode === 'edit') {
        await apiFetch(`/api/memory/${memoryEditor.item.id}`, { method: 'PATCH', body: JSON.stringify({ text }) });
      } else {
        await apiFetch('/api/memory', { method: 'POST', body: JSON.stringify({ text }) });
      }
      setMemoryEditor(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };
  const act = async (item, action) => {
    if (action === 'add' || action === 'edit') {
      openMemoryEditor(item, action);
      return;
    }
    setBusyId(item.id); setError('');
    try {
      if (action === 'delete') await apiFetch(`/api/memory/${item.id}`, { method: 'DELETE' });
      else if (action === 'rerun') await apiFetch(`/api/workflows/${item.id}/rerun`, { method: 'POST', body: '{}' });
      else await apiFetch(`/api/workflows/${item.id}/approve`, { method: 'POST', body: JSON.stringify({ all: Boolean(item.socialDrafts) }) });
      await load();
    } catch (err) { setError(err.message); } finally { setBusyId(''); }
  };
  const page = copy[kind];
  return <><div className="bg-grid" /><main className="shell"><Navbar title={page.title} /><div className="workspace-page"><Sidebar /><section className="panel page-content"><p className="eyebrow">{page.eyebrow}</p><h1>{page.title}</h1><p className="lede">{page.description}</p>{kind === 'memory' ? <button className="primary" onClick={() => act({ id: 'new-memory' }, 'add')}>Add memory</button> : null}{error ? <p className="auth-error">{error}</p> : null}<div className="resource-list">{visible.length ? visible.map((item) => <article className="resource-card" key={item.id}><strong>{item.goalText || item.text || item.title || 'Saved memory'}</strong><span className="muted">{item.status || item.metadata?.action || 'Context'}</span>{kind === 'memory' ? <div className="action-row"><button className="ghost" disabled={busyId === item.id} onClick={() => act(item, 'edit')}>Edit</button><button className="secondary" disabled={busyId === item.id} onClick={() => act(item, 'delete')}>Delete</button></div> : null}{kind === 'history' ? <button className="ghost" disabled={busyId === item.id} onClick={() => act(item, 'rerun')}>Re-run workflow</button> : null}{kind === 'approvals' ? <button className="primary" disabled={busyId === item.id} onClick={() => act(item, 'approve')}>{item.socialDrafts ? '✅ Approve All' : 'Approve and continue'}</button> : null}</article>) : <div className="details-empty compact">Nothing to show yet.</div>}</div></section></div><Dialog open={Boolean(memoryEditor)} onClose={() => setMemoryEditor(null)}><form onSubmit={saveMemory}><div className="modal-header"><p className="eyebrow">Memory Vault</p><h2>{memoryEditor?.mode === 'edit' ? 'Edit saved memory' : 'Add memory'}</h2></div><div className="modal-body"><p className="modal-copy">Save a brand voice, posting time, preference, or other context Proxima should remember.</p><label className="field"><span>Memory</span><textarea rows={5} value={memoryEditor?.text || ''} onChange={(event) => setMemoryEditor((current) => current ? { ...current, text: event.target.value } : current)} placeholder="Example: Keep launch posts concise and confident." autoFocus /></label></div><div className="modal-actions action-row"><button type="button" className="secondary" onClick={() => setMemoryEditor(null)}>Cancel</button><button type="submit" className="primary" disabled={busyId === (memoryEditor?.item?.id || 'new-memory')}>{memoryEditor?.mode === 'edit' ? 'Save changes' : 'Save memory'}</button></div></form></Dialog></main></>;
}

export default function WorkspacePage({ kind }) { return <AuthGate><Inner kind={kind} /></AuthGate>; }
