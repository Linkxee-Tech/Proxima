'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

const iconFor = (type = '') => {
  const value = type.toLowerCase();
  if (value.includes('spread') || value.includes('csv')) return 'fileSpreadsheet';
  if (value.includes('pdf') || value.includes('report')) return 'fileChart';
  if (value.includes('zip') || value.includes('archive')) return 'fileArchive';
  if (value.includes('code') || value.includes('json')) return 'fileCode';
  return 'fileText';
};

export default function ArtifactCard({ artifact, onDownload, onSave, onImprove }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(artifact.content || '');
  const [busy, setBusy] = useState(false);
  const [improveError, setImproveError] = useState('');

  useEffect(() => { setContent(artifact.content || ''); }, [artifact.content]);

  const save = async () => {
    setBusy(true);
    try {
      await onSave?.(artifact, content);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const improve = async () => {
    setBusy(true);
    setImproveError('');
    try {
      const updated = await onImprove?.(artifact);
      if (updated?.content) setContent(updated.content);
    } catch (error) {
      const seconds = Number(error?.retryAfterSeconds);
      setImproveError(seconds > 0
        ? `OpenAI is busy. Please wait about ${Math.ceil(seconds / 60)} minute${seconds > 60 ? 's' : ''}, then try again.`
        : (error?.message || 'The draft could not be improved right now.'));
    } finally {
      setBusy(false);
    }
  };

  return <article className="artifact">
    <div className="artifact-head">
      <div className="with-icon"><span className="artifact-icon"><Icon name={iconFor(artifact.type)} /></span><div><h4>{artifact.title}</h4><small>{artifact.type}</small></div></div>
      <div className="action-row">
        <button type="button" className="ghost with-icon" disabled={busy} onClick={() => setEditing((value) => !value)}><Icon name="fileText" size={15} /> {editing ? 'Preview' : 'Edit'}</button>
        <button type="button" className="ghost with-icon" disabled={busy} onClick={improve}><Icon name="spark" size={15} /> Improve with AI</button>
        <button type="button" className="ghost with-icon" onClick={() => onDownload?.(artifact)}><Icon name="download" size={15} /> Download</button>
      </div>
    </div>
    {improveError ? <p className="artifact-error" role="alert">{improveError}</p> : null}
    {editing ? <>
      <label className="field artifact-editor"><span>Edit this prepared work before continuing</span><textarea rows={18} value={content} onChange={(event) => setContent(event.target.value)} /></label>
      <div className="action-row"><button type="button" className="secondary" disabled={busy} onClick={() => { setContent(artifact.content || ''); setEditing(false); }}>Discard changes</button><button type="button" className="primary" disabled={busy || !content.trim()} onClick={save}>{busy ? 'Saving...' : 'Save changes'}</button></div>
    </> : <pre>{content}</pre>}
  </article>;
}
