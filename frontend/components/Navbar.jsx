'use client';

import Image from 'next/image';
import Link from 'next/link';
import Icon from './Icon';

export default function Navbar({ title = 'Proxima OS', action }) {
  return (
    <header className="topbar panel">
      <Link className="brand-block" href="/">
        <span className="brand-mark"><Image src="/proxima-command-mark.png" alt="Proxima" width={34} height={34} priority /></span>
        <span><span className="eyebrow">AI-native operating system</span><strong>{title}</strong></span>
      </Link>
      <div className="topbar-actions">
        <span className="status-pill ok"><Icon name="activity" size={13} /> Live</span>
        <button type="button" className="icon-button" aria-label="Notifications"><Icon name="bell" /></button>
        <button type="button" className="icon-button" aria-label="Help"><Icon name="help" /></button>
        {action}
      </div>
    </header>
  );
}
