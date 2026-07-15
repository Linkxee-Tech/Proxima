'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  ['/dashboard', 'Dashboard', 'grid'],
  ['/dashboard/approvals', 'Approvals', 'shield'],
  ['/dashboard/memory', 'Memory', 'brain'],
  ['/dashboard/history', 'History', 'clock'],
  ['/dashboard/social', 'Social', 'share'],
  ['/dashboard/settings', 'Settings', 'settings'],
  ['/dashboard/integrations', 'Integrations', 'plug'],
];

function NavIcon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    shield: <><path d="M12 3 20 6.5v5.1c0 4.8-3.2 7.7-8 9.4-4.8-1.7-8-4.6-8-9.4V6.5L12 3Z" /><path d="m9 12 2 2 4-4" /></>,
    brain: <><path d="M9 5.1A3.5 3.5 0 0 0 3.8 8.2 3.7 3.7 0 0 0 5 15.1 3.6 3.6 0 0 0 9 19v-14Z" /><path d="M15 5.1a3.5 3.5 0 0 1 5.2 3.1 3.7 3.7 0 0 1-1.2 6.9A3.6 3.6 0 0 1 15 19v-14Z" /><path d="M9 9h6M9 14h6" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
    share: <><circle cx="18" cy="5" r="2.2" /><circle cx="6" cy="12" r="2.2" /><circle cx="18" cy="19" r="2.2" /><path d="m8 11 7.8-4.8M8 13l7.8 4.8" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.4 2.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.4-2.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4.3v-3.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L8 5.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.4 2.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>,
    plug: <><path d="M8 3v6M16 3v6M6 9h12v1a6 6 0 0 1-6 6 6 6 0 0 1-6-6V9ZM12 16v5" /></>,
  };
  return <svg className="sidebar-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export default function Sidebar() {
  const pathname = usePathname();
  return <nav className="sidebar" aria-label="Workspace navigation">{items.map(([href, label, icon]) => <Link key={href} className={pathname === href ? 'active' : ''} href={href}><NavIcon name={icon} /><span>{label}</span></Link>)}</nav>;
}
