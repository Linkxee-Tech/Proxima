'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

const items = [
  ['/dashboard', 'Dashboard', 'grid'],
  ['/dashboard/approvals', 'Approvals', 'shield'],
  ['/dashboard/memory', 'Memory', 'brain'],
  ['/dashboard/history', 'History', 'clock'],
  ['/dashboard/social', 'Social', 'share'],
  ['/dashboard/settings', 'Settings', 'settings'],
  ['/dashboard/integrations', 'Integrations', 'plug'],
];

export default function Sidebar() {
  const pathname = usePathname();
  return <nav className="sidebar" aria-label="Workspace navigation">{items.map(([href, label, icon]) => <Link key={href} className={pathname === href ? 'active' : ''} href={href}><Icon className="sidebar-icon" name={icon} /><span>{label}</span></Link>)}</nav>;
}
