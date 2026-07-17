import type { ReactNode } from 'react';
import Icon from '../Icon';
export function Dialog({open,onClose,children}:{open:boolean;onClose:()=>void;children:ReactNode}){return open?<div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="modal-card panel" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><button className="ghost with-icon" aria-label="Close dialog" onClick={onClose}><Icon name="x" size={16}/> Close</button>{children}</div></div>:null}
