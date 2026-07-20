'use client';

import { useEffect, useState } from 'react';
import AuthGate from './AuthGate';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { apiFetch } from '../lib/proxima-api';

function Insights() {
  const [workflows, setWorkflows] = useState([]);
  const [connections, setConnections] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([apiFetch('/api/workflows'), apiFetch('/api/integrations')])
      .then(([work, apps]) => { setWorkflows(work.items || []); setConnections(apps.items || []); })
      .catch((err) => setError(err.message || 'Unable to load insights.'));
  }, []);

  const completed = workflows.filter((item) => item.status === 'completed').length;
  const finished = workflows.filter((item) => ['completed', 'failed', 'cancelled'].includes(item.status));
  const successful = finished.filter((item) => item.status === 'completed').length;
  const successRate = finished.length ? Math.round((successful / finished.length) * 100) : 0;
  const connected = connections.filter((item) => item.connected).length;
  const working = workflows.filter((item) => ['running', 'queued'].includes(item.status)).length;
  const activity = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index));
    const count = workflows.filter((item) => {
      const updated = new Date(item.updatedAt || item.createdAt || 0); updated.setHours(0, 0, 0, 0);
      return updated.getTime() === day.getTime();
    }).length;
    return { label: day.toLocaleDateString([], { weekday: 'short' }), count };
  });
  const activityMax = Math.max(1, ...activity.map((item) => item.count));

  return <><div className="bg-grid" /><main className="shell"><Navbar title="Insights" /><div className="workspace-page"><Sidebar /><section className="panel page-content"><p className="eyebrow">A clear picture of your work</p><h1>Insights</h1><p className="lede">These numbers are calculated from your actual requests and connected apps.</p>{error ? <p className="auth-error">{error}</p> : null}<div className="insight-grid"><article className="insight-card"><span>Completed</span><strong>{completed}</strong><p>Requests finished</p></article><article className="insight-card"><span>Working now</span><strong>{working}</strong><p>Requests in progress</p></article><article className="insight-card"><span>Connected apps</span><strong>{connected}</strong><p>Apps you have approved</p></article><article className="insight-card"><span>Success rate</span><strong>{successRate}%</strong><p>Of finished requests</p></article></div><section className="activity-chart"><div><p className="eyebrow">Recent activity</p><h2>Your last seven days</h2></div><ol>{activity.map((item) => <li key={item.label}><span className="activity-bar" style={{ height: `${Math.max(8, Math.round((item.count / activityMax) * 100))}%` }} title={`${item.count} request${item.count === 1 ? '' : 's'}`} /><small>{item.label}</small><strong>{item.count}</strong></li>)}</ol></section><section className="insight-summary"><p className="eyebrow">A quick read</p><h2>{completed ? `You’ve completed ${completed} request${completed === 1 ? '' : 's'} with Proxima.` : 'Your progress will appear here after your first request.'}</h2><p>{working ? `There ${working === 1 ? 'is' : 'are'} ${working} request${working === 1 ? '' : 's'} currently in motion.` : 'Nothing is currently in motion.'}</p><p className="muted">Time saved will appear when work-duration estimates are available. Proxima does not guess this number.</p></section></section></div></main></>;
}

export default function InsightsPage() { return <AuthGate><Insights /></AuthGate>; }
