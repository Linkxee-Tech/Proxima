import Icon from './Icon';

export default function ApprovalCard({ title, requester, priority='normal', onApprove, onReject, onDefer }: { title:string; requester?:string; priority?:string; onApprove:()=>void; onReject:()=>void; onDefer:()=>void }) {
  return <article className="resource-card"><div className="resource-title with-icon"><span className="section-icon warning"><Icon name="alert" /></span><strong>{title}</strong></div><span className="muted">{requester || 'Proxima'} · {priority}</span><div className="action-row"><button className="primary with-icon" onClick={onApprove}><Icon name="check" size={15} /> Approve</button><button className="secondary with-icon" onClick={onReject}><Icon name="x" size={15} /> Reject</button><button className="ghost with-icon" onClick={onDefer}><Icon name="clock" size={15} /> Defer</button></div></article>;
}
