import Icon from './Icon';

export default function MemoryCard({ text, source, timestamp, onEdit, onDelete }: { text:string; source?:string; timestamp?:string; onEdit:()=>void; onDelete:()=>void }) {
  return <article className="resource-card"><div className="resource-title with-icon"><span className="section-icon"><Icon name="brain" /></span><strong>{text}</strong></div><span className="muted">{source || 'Manual memory'} · {timestamp || 'now'}</span><div className="action-row"><button className="ghost with-icon" onClick={onEdit}><Icon name="pencil" size={15} /> Edit</button><button className="secondary with-icon" onClick={onDelete}><Icon name="x" size={15} /> Delete</button></div></article>;
}
