'use client';

import Icon from './Icon';
import { Card } from './ui/card';

const socialLabel = (platform) => platform === 'twitter' ? 'Twitter / X' : platform[0].toUpperCase() + platform.slice(1);

export default function ApprovalModal({ workflow, onApprove, onCancel, onClose }) {
  if (!workflow) return null;
  const approvalStep = workflow.steps.find((step) => step.isApprovalGate && step.status === 'waiting_approval');
  const socialDrafts = workflow.socialDrafts && Object.entries(workflow.socialDrafts);
  return <div className="modal-backdrop" role="presentation" onClick={onClose}><div className="modal-card panel" role="dialog" aria-modal="true" aria-labelledby="approval-title" onClick={(event) => event.stopPropagation()}>
    <div className="modal-header"><div><p className="eyebrow with-icon"><Icon name="alert" size={14} /> Approval required</p><h3 id="approval-title">{workflow.goalText}</h3></div><button type="button" className="ghost with-icon" onClick={onClose}><Icon name="x" size={17} /> Close</button></div>
    <div className="modal-body"><div className="modal-summary"><div className="summary-item"><span className="summary-label">Action</span><strong>{workflow.parsed.action}</strong></div><div className="summary-item"><span className="summary-label">Gate</span><strong>{approvalStep ? approvalStep.title : 'Waiting for human review'}</strong></div><div className="summary-item"><span className="summary-label">Artifacts</span><strong>{workflow.artifacts.length}</strong></div></div><p className="modal-copy">{socialDrafts ? 'Review the tailored posts below. One approval releases every platform branch.' : 'This action is paused at a human approval gate. Approving will resume the workflow from the current step.'}</p>{socialDrafts ? <div className="social-preview-grid">{socialDrafts.map(([platform, text]) => <Card key={platform}><div className="social-preview-heading"><span className={`platform-icon platform-${platform}`}><Icon name={platform} size={16} /></span><strong>{socialLabel(platform)}</strong></div><p>{text}</p></Card>)}</div> : null}</div>
    <div className="modal-actions"><button type="button" className="secondary with-icon" onClick={onCancel}><Icon name="x" size={15} /> Cancel workflow</button><button type="button" className="primary with-icon" onClick={onApprove}><Icon name="check" size={15} /> {socialDrafts ? 'Approve All' : 'Approve and continue'}</button></div>
  </div></div>;
}
