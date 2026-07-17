'use client';

import Icon from './Icon';

export default function MagicInput({ value, onChange, onSubmit, busy = false }) {
  return <form className="goal-form" onSubmit={onSubmit}><label className="field"><span>Your goal</span><textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Launch our v2 on all social channels" /></label><button className="primary with-icon" disabled={busy} type="submit"><Icon name={busy ? 'activity' : 'zap'} size={16} /> {busy ? 'Deploying…' : 'Deploy'}</button></form>;
}
