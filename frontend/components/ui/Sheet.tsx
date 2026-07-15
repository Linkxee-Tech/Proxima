import type { ReactNode } from 'react';
export function Sheet({open,onClose,children}:{open:boolean;onClose:()=>void;children:ReactNode}){return open?<aside className="panel sheet" role="dialog" aria-modal="true"><button className="ghost" onClick={onClose}>Close</button>{children}</aside>:null}
