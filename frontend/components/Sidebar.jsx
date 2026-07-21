'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

const items = [
  ['/dashboard', 'Home', 'grid'],
  ['/dashboard#new-request', 'New request', 'zap'],
  ['/dashboard/work', 'My Work', 'workflow'],
  ['/dashboard/drafts', 'Drafts', 'fileText'],
  ['/dashboard/approvals', 'Needs Your Approval', 'shield'],
  ['/dashboard/memory', 'Knowledge', 'brain'],
  ['/dashboard/social', 'Campaigns', 'share'],
  ['/dashboard/social/recurring', 'Recurring campaigns', 'refresh'],
  ['/dashboard/history', 'History', 'clock'],
  ['/dashboard/insights', 'Insights', 'activity'],
  ['/dashboard/settings', 'Settings', 'settings'],
  ['/dashboard/integrations', 'Connected Apps', 'plug'],
];

export default function Sidebar() {
  const pathname = usePathname();
  return <nav className="sidebar" aria-label="Workspace navigation">{items.map(([href, label, icon]) => <Link key={href} className={!href.includes('#') && pathname === href ? 'active' : ''} href={href}><Icon className="sidebar-icon" name={icon} /><span>{label}</span></Link>)}</nav>;
}
