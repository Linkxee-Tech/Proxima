'use client';

import Icon from './Icon';

function titleFor(step = {}) {
  const title = String(step.title || '').toLowerCase();
  if (step.isApprovalGate || title.includes('approval') || title.includes('review')) return 'Waiting for your review';
  if (title.includes('intent') || title.includes('understand')) return 'Understanding your request';
  if (title.includes('draft')) return 'Preparing a draft';
  if (title.includes('tailor')) return 'Preparing the right version for each channel';
  return step.title || 'Preparing the next step';
}

function stateFor(step = {}) {
  if (step.status === 'done' || step.status === 'skipped') return 'done';
  if (step.status === 'waiting_approval') return 'waiting';
  if (step.status === 'deferred') return 'deferred';
  return 'pending';
}

function estimate(work) {
  if (work?.status === 'completed') return 'Everything is ready';
  if (work?.status === 'waiting_approval') return 'Waiting for your decision';
  if (work?.status === 'deferred') return 'Saved for later';
  const remaining = (work?.steps || []).filter((step) => !['done', 'skipped'].includes(step.status)).length;
  return remaining ? `Estimated: about ${Math.max(2, remaining * 2)} minutes` : 'Ready to begin';
}

export default function MissionTimeline({ work }) {
  const steps = work?.steps || [];
  if (!steps.length) return <p className="muted">The plan will appear here when work starts.</p>;
  const done = steps.filter((step) => ['done', 'skipped'].includes(step.status)).length;
  const progress = Math.round((done / steps.length) * 100);
  return <section className="mission-timeline" aria-label="Mission timeline"><div className="mission-timeline-head"><strong>Mission timeline</strong><span>{estimate(work)}</span></div><div className="progress-track" aria-label={`${progress}% complete`}><div className="progress-fill" style={{ width: `${progress}%` }} /></div><ol>{steps.map((step) => { const state = stateFor(step); const icon = state === 'done' ? 'check' : state === 'waiting' ? 'alert' : state === 'deferred' ? 'clock' : 'activity'; return <li className={state} key={step.id || step.title}><span className="mission-step-icon"><Icon name={icon} size={14} /></span><span>{titleFor(step)}</span><small>{state === 'done' ? 'Completed' : state === 'waiting' ? 'Needs your approval' : state === 'deferred' ? 'Saved for later' : 'Up next'}</small></li>; })}</ol></section>;
}
