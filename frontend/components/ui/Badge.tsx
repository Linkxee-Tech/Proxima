import type { ReactNode } from 'react';
export function Badge({children,variant='default'}:{children:ReactNode;variant?:'default'|'success'|'warning'|'danger'}){return <span className={`status-pill ${variant}`}>{children}</span>}
