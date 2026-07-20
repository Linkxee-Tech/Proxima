'use client';

import Icon from './Icon';
import { Card } from './ui/card';

const socialLabel = (platform) => platform === 'twitter' ? 'Twitter / X' : platform[0].toUpperCase() + platform.slice(1);

export default function ApprovalModal({ workflow, onApprove, onCancel, onDefer, onClose }) {
  if (!workflow) return null;
  const approvalStep = (workflow.steps || []).find((step) => step.isApprovalGate && step.status === 'waiting_approval');
  const socialDrafts = workflow.socialDrafts && Object.entries(workflow.socialDrafts);
  const risk = workflow.risk || {};
  return <div className="modal-backdrop" role="presentation" onClick={onClose}><div className="modal-card panel" role="dialog" aria-modal="true" aria-labelledby="approval-title" onClick={(event) => event.stopPropagation()}>
    <div className="modal-header"><div><p className="eyebrow with-icon"><Icon name="alert" size={14} /> I need your approval</p><h3 id="approval-title">{workflow.goalText}</h3></div><button type="button" className="ghost with-icon" onClick={onClose}><Icon name="x" size={17} /> Close</button></div>
    <div className="modal-body"><div className="modal-summary"><div className="summary-item"><span className="summary-label">Next step</span><strong>{approvalStep ? approvalStep.title : 'Your review'}</strong></div><div className="summary-item"><span className="summary-label">Why review is needed</span><strong>{risk.reason || 'Your decision is required before this work continues.'}</strong></div><div className="summary-item"><span className="summary-label">Ready now</span><strong>{workflow.artifacts.length}</strong></div></div><div className="approval-impact"><div><span>Scope</span><strong>{risk.affectedTools?.length ? risk.affectedTools.join(', ') : 'No outside service'}</strong></div><div><span>Rollback</span><strong>{risk.rollback || 'You can cancel this work.'}</strong></div></div><p className="modal-copy">{socialDrafts ? 'Please review the drafts below. Approving marks them as reviewed; this screen does not publish to an outside account.' : 'This request is ready for your decision. No outside account has been changed by this workflow.'}</p>{socialDrafts ? <div className="social-preview-grid">{socialDrafts.map(([platform, text]) => <Card key={platform}><div className="social-preview-heading"><span className={`platform-icon platform-${platform}`}><Icon name={platform} size={16} /></span><strong>{socialLabel(platform)}</strong></div><p>{text}</p></Card>)}</div> : null}</div>
    <div className="modal-actions"><button type="button" className="secondary with-icon" onClick={onCancel}><Icon name="x" size={15} /> Cancel work</button>{onDefer ? <button type="button" className="ghost with-icon" onClick={onDefer}><Icon name="clock" size={15} /> Decide later</button> : null}<button type="button" className="primary with-icon" onClick={onApprove}><Icon name="check" size={15} /> {socialDrafts ? 'Approve drafts' : 'Approve and continue'}</button></div>
  </div></div>;
}
