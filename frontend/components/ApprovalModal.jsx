'use client';

import { Card } from './ui/card';

export default function ApprovalModal({ workflow, onApprove, onCancel, onClose }) {
  if (!workflow) return null;

  const approvalStep = workflow.steps.find((step) => step.isApprovalGate && step.status === 'waiting_approval');
  const socialDrafts = workflow.socialDrafts && Object.entries(workflow.socialDrafts);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Approval required</p>
            <h3 id="approval-title">{workflow.goalText}</h3>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-summary">
            <div className="summary-item">
              <span className="summary-label">Action</span>
              <strong>{workflow.parsed.action}</strong>
            </div>
            <div className="summary-item">
              <span className="summary-label">Gate</span>
              <strong>{approvalStep ? approvalStep.title : 'Waiting for human review'}</strong>
            </div>
            <div className="summary-item">
              <span className="summary-label">Artifacts</span>
              <strong>{workflow.artifacts.length}</strong>
            </div>
          </div>

          <p className="modal-copy">
            {socialDrafts ? 'Review the tailored posts below. One approval releases every platform branch.' : 'This action is paused at a human approval gate. Approving will resume the workflow from the current step.'}
          </p>
          {socialDrafts ? <div className="social-preview-grid">{socialDrafts.map(([platform, text]) => <Card key={platform}><div className="social-preview-heading"><span>{({ twitter: '🐦', linkedin: '🔗', facebook: '📘', whatsapp: '💬' })[platform]}</span><strong>{platform === 'twitter' ? 'Twitter / X' : platform[0].toUpperCase() + platform.slice(1)}</strong></div><p>{text}</p></Card>)}</div> : null}
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel workflow
          </button>
          <button type="button" className="primary" onClick={onApprove}>
            {socialDrafts ? '✅ Approve All' : 'Approve and continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
