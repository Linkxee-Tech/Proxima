'use client';

import Link from 'next/link';

export default function Navbar({ title = 'Proxima OS', action }) {
  return <header className="topbar panel"><Link className="brand-block" href="/"><span className="brand-mark">P</span><span><span className="eyebrow">AI-native operating system</span><strong>{title}</strong></span></Link><div className="topbar-actions"><span className="status-pill ok">● Active</span>{action}</div></header>;
}
