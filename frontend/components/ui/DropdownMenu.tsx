import { useState, type ReactNode } from 'react';
export function DropdownMenu({label,children}:{label:string;children:ReactNode}){const [open,setOpen]=useState(false);return <span className="dropdown"><button className="ghost" aria-expanded={open} onClick={()=>setOpen(!open)}>{label}</button>{open?<div role="menu" className="panel">{children}</div>:null}</span>}
