'use client';

import Icon from './Icon';

export default function MagicInput({ value, onChange, onSubmit, busy = false }) {
  return <form className="goal-form" onSubmit={onSubmit}><label className="field"><span>What would you like to accomplish today?</span><textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Prepare tomorrow's board meeting" /></label><button className="primary with-icon" disabled={busy} type="submit"><Icon name={busy ? 'activity' : 'zap'} size={16} /> {busy ? 'Preparing your plan…' : 'Start working'}</button></form>;
}
