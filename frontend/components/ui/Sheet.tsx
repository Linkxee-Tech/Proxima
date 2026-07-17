import type { ReactNode } from 'react';
import Icon from '../Icon';
export function Sheet({open,onClose,children}:{open:boolean;onClose:()=>void;children:ReactNode}){return open?<aside className="panel sheet" role="dialog" aria-modal="true"><button className="ghost with-icon" onClick={onClose}><Icon name="x" size={16}/> Close</button>{children}</aside>:null}
