import type { ReactNode } from 'react';
export function ScrollArea({children,className='' }:{children:ReactNode;className?:string}){return <div className={`scroll-area ${className}`}>{children}</div>}
