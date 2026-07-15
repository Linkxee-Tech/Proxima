import type { ReactNode } from 'react';
export function Alert({children,variant='info'}:{children:ReactNode;variant?:'info'|'warning'|'error'|'success'}){return <div role="alert" className={`alert alert-${variant}`}>{children}</div>}
