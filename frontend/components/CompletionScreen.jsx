'use client';

import Icon from './Icon';

export default function CompletionScreen({ work, onViewDetails }) {
  if (!work || work.status !== 'completed') return null;
  const completed = (work.steps || []).filter((step) => step.status === 'done').map((step) => step.title).slice(0, 4);
  return <section className="completion-screen" aria-label="Completed work"><div><p className="eyebrow with-icon"><Icon name="checkCircle" size={15} /> Done</p><h3>Everything is ready.</h3><p className="muted">Completed {completed.length || work.artifacts?.length || 1} item{(completed.length || work.artifacts?.length || 1) === 1 ? '' : 's'} for this request.</p></div>{completed.length ? <ul>{completed.map((item) => <li key={item}><Icon name="check" size={14} /> {item}</li>)}</ul> : null}<button type="button" className="ghost with-icon" onClick={onViewDetails}><Icon name="search" size={15} /> View everything</button></section>;
}
