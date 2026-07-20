'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import ApprovalModal from './ApprovalModal';
import DAGVisualizer from './DAGVisualizer';
import ArtifactCard from './ArtifactCard';
import TerminalLog from './TerminalLog';
import Icon from './Icon';
import { ToastProvider, useToast } from './ToastProvider';
import { apiFetch } from '../lib/proxima-api';

function titleCase(value = '') {
  return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function GoalUnderstanding({ intent, goal, tasks = [], approvalNeeded = false, detailed = false }) {
  if (intent?.error) {
    return <div className="understanding-empty"><span>!</span><p>Proxima is reconnecting before it can map this goal.</p></div>;
  }

  if (!intent) {
    return <div className="understanding-empty"><span>+</span><p>Choose a starter or describe what you want to accomplish. Proxima will turn it into a clear plan here.</p></div>;
  }

  const social = String(intent.action || '').includes('social');
  const needsApproval = approvalNeeded || Boolean(intent.requiresApproval) || social;
  const channels = Array.isArray(intent.entities?.channels)
    ? intent.entities.channels
    : String(intent.entities?.channels || '').split(',').filter(Boolean);
  const defaultSteps = social
    ? ['Understand the campaign', 'Create tailored channel drafts', 'Wait for your publishing approval']
    : ['Understand the outcome', 'Prepare the work', needsApproval ? 'Wait for your confirmation' : 'Share the completed result'];
  const plannedSteps = (tasks.length ? tasks : intent.tasks || [])
    .filter((task) => !task.isApprovalGate)
    .map((task) => task.title)
    .filter(Boolean)
    .slice(0, 4);
  const steps = plannedSteps.length ? plannedSteps : defaultSteps;

  return (
    <div className={`goal-understanding ${detailed ? 'detailed' : ''}`}>
      <div className="understanding-topline">
        <span className="understanding-icon"><Icon name="spark" size={16} /></span>
        <div>
          <strong>{social ? 'Campaign workflow' : 'Workflow plan'}</strong>
          <span>{titleCase(intent.action || 'automation')}</span>
        </div>
        <span className={`understanding-safety ${needsApproval ? 'approval' : 'safe'}`}>
          {needsApproval ? 'Approval required' : 'Ready to prepare'}
        </span>
      </div>
      <p className="understanding-summary">{intent.summary || goal || 'Proxima is preparing a workflow from your request.'}</p>
      {channels.length ? <div className="understanding-chips">{channels.map((channel) => <span key={channel}>{titleCase(channel)}</span>)}</div> : null}
      <ol className="understanding-steps">
        {steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
      </ol>
      {needsApproval ? <p className="understanding-note">No external action will happen until you review and approve it.</p> : null}
    </div>
  );
}

function DashboardShell() {
  const { pushToast } = useToast();
  const router = useRouter();
  const [workflows, setWorkflows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [lastIntent, setLastIntent] = useState(null);
  const [inputValue, setInputValue] = useState('Send an email to John saying I\'ll be late.');
  const [approvalWorkflow, setApprovalWorkflow] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const lastErrorRef = useRef('');
  const sidebarRef = useRef(null);
  const navToggleRef = useRef(null);
  const authToken = typeof window === 'undefined' ? '' : window.localStorage.getItem('proxima_token');

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedId) || workflows[0] || null,
    [workflows, selectedId]
  );

  const pendingApprovals = useMemo(
    () => workflows.filter((workflow) => workflow.status === 'waiting_approval'),
    [workflows]
  );

  const contacts = useMemo(() => blueprint?.memory || [], [blueprint]);

  const loadDashboard = useCallback(
    async (preserveSelection = true) => {
      setIsRefreshing(true);
      try {
        const [nextMetrics, nextBlueprint, nextWorkflows] = await Promise.all([
          apiFetch('/api/metrics'),
          apiFetch('/api/blueprint'),
          apiFetch('/api/workflows'),
        ]);

        setMetrics(nextMetrics);
        setBlueprint(nextBlueprint);
        setWorkflows(nextWorkflows.items || []);
        setError(null);
        lastErrorRef.current = '';

        const nextSelectedId = nextWorkflows.items?.[0]?.id || null;
        setSelectedId((current) => {
          if (!preserveSelection || !current) return nextSelectedId;
          if (!nextWorkflows.items?.some((workflow) => workflow.id === current)) {
            return nextSelectedId;
          }
          return current;
        });
      } catch (err) {
        const message = err.message || 'Failed to load dashboard';
        setError(message);
        if (lastErrorRef.current !== message) {
          pushToast(message, 'error');
          lastErrorRef.current = message;
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [pushToast]
  );

  useEffect(() => {
    loadDashboard(false);
    let socket;
    let reconnectTimer;
    let stopped = false;
    const connect = () => {
      const configured = process.env.NEXT_PUBLIC_PROXIMA_WS_URL || process.env.NEXT_PUBLIC_WS_URL;
      const token = window.localStorage.getItem('proxima_token');
      if (!token) {
        setRealtimeConnected(false);
        return;
      }
      const hostedBrowser = !['localhost', '127.0.0.1'].includes(window.location.hostname);
      const configuredIsLocal = configured ? /^wss?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?\//i.test(configured) : false;
      const fallback = hostedBrowser
        ? 'wss://proxima-8d3w.onrender.com/ws'
        : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://localhost:8000/ws`;
      const socketBase = configured && !(hostedBrowser && configuredIsLocal) ? configured : fallback;
      const target = `${socketBase}${socketBase.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
      socket = new WebSocket(target);
      socket.onopen = () => { setRealtimeConnected(true); setError(null); };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'workflow.updated' && message.workflow) {
            setWorkflows((current) => [message.workflow, ...current.filter((item) => item.id !== message.workflow.id)]);
            setMetrics((current) => current ? {
              ...current,
              total: Math.max(current.total, 1),
            } : current);
          }
        } catch { /* Ignore malformed realtime messages. */ }
      };
      socket.onclose = () => { setRealtimeConnected(false); if (!stopped) reconnectTimer = setTimeout(connect, 1500); };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => { stopped = true; clearTimeout(reconnectTimer); socket?.close(); };
  }, [loadDashboard, authToken]);

  useEffect(() => {
    setIsAuthenticated(Boolean(window.localStorage.getItem('proxima_token')));
  }, []);

  useEffect(() => {
    if (!workflows.length) {
      setSelectedNode(null);
      return;
    }

    const nextSelected = workflows.find((workflow) => workflow.id === selectedId) || workflows[0];
    if (!nextSelected) {
      setSelectedNode(null);
      return;
    }

    if (selectedNode && nextSelected.steps.every((step) => step.id !== selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [workflows, selectedId, selectedNode]);

  useEffect(() => {
    const previewText = inputValue.trim();
    if (!previewText) {
      setLastIntent(null);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        const intent = await apiFetch('/api/intent', {
          method: 'POST',
          body: JSON.stringify({ goalText: previewText }),
        });
        setLastIntent(intent);
      } catch (err) {
        setLastIntent({ error: err.message, text: previewText });
      }
    }, 800);

    return () => clearTimeout(handle);
  }, [inputValue]);

  useEffect(() => {
    const collapseOnOutsideClick = (event) => {
      if (!sidebarOpen) return;
      if (sidebarRef.current?.contains(event.target) || navToggleRef.current?.contains(event.target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('pointerdown', collapseOnOutsideClick);
    return () => document.removeEventListener('pointerdown', collapseOnOutsideClick);
  }, [sidebarOpen]);

  const createWorkflow = async (event) => {
    event.preventDefault();
    const goalText = inputValue.trim();
    if (!goalText) return;

    try {
      const workflow = await apiFetch('/api/workflows', {
        method: 'POST',
        body: JSON.stringify({ goalText }),
      });
      setWorkflows((current) => [workflow, ...current.filter((item) => item.id !== workflow.id)]);
      setSelectedId(workflow.id);
      setSelectedNode(null);
      setLastIntent(workflow.parsed);
      pushToast('Workflow created and queued.', 'success');
      await loadDashboard(true);
      setInputValue('');
    } catch (err) {
      pushToast(err.message || 'Could not create workflow', 'error');
    }
  };

  const handleApprove = async () => {
    if (!approvalWorkflow) return;

    try {
      await apiFetch(`/api/workflows/${approvalWorkflow.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ all: Boolean(approvalWorkflow.socialDrafts) }),
      });
      pushToast('Approval granted. Workflow resumed.', 'success');
      setApprovalWorkflow(null);
      await loadDashboard(true);
    } catch (err) {
      pushToast(err.message || 'Approval failed', 'error');
    }
  };

  const handleCancel = async (workflow) => {
    if (!workflow) return;

    try {
      await apiFetch(`/api/workflows/${workflow.id}/cancel`, {
        method: 'POST',
        body: '{}',
      });
      pushToast('Workflow cancelled.', 'warning');
      setApprovalWorkflow(null);
      await loadDashboard(true);
    } catch (err) {
      pushToast(err.message || 'Cancellation failed', 'error');
    }
  };

  const downloadArtifact = async (workflow, artifact) => {
    try {
      const token = window.localStorage.getItem('proxima_token');
      const response = await fetch(`/api/workflows/${workflow.id}/artifacts/${artifact.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Download failed.');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${artifact.title}.${artifact.extension || 'txt'}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) { pushToast(err.message || 'Could not download artifact.', 'error'); }
  };

  const sample = (value) => {
    setInputValue(value);
    pushToast('Sample loaded into the composer.', 'info');
  };

  const handleLogout = async () => {
    const refreshToken = window.localStorage.getItem('proxima_refresh_token');
    try {
      if (refreshToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      window.localStorage.removeItem('proxima_token');
      window.localStorage.removeItem('proxima_refresh_token');
      setIsAuthenticated(false);
      router.replace('/');
      router.refresh();
    }
  };

  return (
    <>
      <div className="bg-grid" />
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />

      <main className="shell">
      <header className="topbar panel">
        <div className="brand-block">
          <div className="brand-mark"><Image src="/proxima-command-mark.png" alt="Proxima" width={29} height={29} priority /></div>
          <div>
            <p className="eyebrow">AI-native operating system</p>
            <h1>PROXIMA</h1>
          </div>
        </div>
        <nav className="command-tabs" aria-label="Workspace sections">
          <a className="active" href="/dashboard">Workspace</a>
          <a href="/dashboard/approvals">Approvals {pendingApprovals.length ? `(${pendingApprovals.length})` : ''}</a>
          <a href="/dashboard/memory">Memory</a>
          <a href="/dashboard/social">Social</a>
        </nav>
        <div className="topbar-actions">
          <button
            ref={navToggleRef}
            type="button"
            className="nav-toggle"
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-sidebar"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span aria-hidden="true">&#9776;</span> Navigation
          </button>
          <span className={`status-pill ${error ? 'danger' : realtimeConnected ? 'ok' : 'warn'}`}>
            {error ? 'Offline' : realtimeConnected ? 'Live' : isRefreshing ? 'Syncing' : 'Reconnecting'}
          </span>
          <button type="button" className="secondary" onClick={() => loadDashboard(true)}>
            Refresh
          </button>
          {isAuthenticated ? (
            <button type="button" className="logout-button" onClick={handleLogout} aria-label="Log out of Proxima">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></svg>
              Log out
            </button>
          ) : null}
        </div>
      </header>

      <section className="hero panel control-strip">
        <div className="hero-copy">
          <p className="eyebrow">Mission control</p>
          <h2>Every action stays visible.</h2>
          <p className="lede">
            Plan, observe, and approve work from one live operating surface.
          </p>
          <div className="hero-chips">
            <span className="chip subtle">Intent parsing</span>
            <span className="chip subtle">Task graph</span>
            <span className="chip subtle">Approval center</span>
            <span className="chip subtle">Memory mesh</span>
          </div>
        </div>
        <div className="hero-stats">
          {[
            { label: 'Workflows', value: metrics?.total || 0 },
            { label: 'Running', value: metrics?.running || 0 },
            { label: 'Awaiting approval', value: metrics?.waitingApproval || 0 },
            { label: 'Completed', value: metrics?.completed || 0 },
          ].map((item) => (
            <article className="stat" key={item.label}>
              <div className="label">{item.label}</div>
              <div className="value">{item.value}</div>
            </article>
          ))}
        </div>
      </section>

      <section className={`workspace ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <aside ref={sidebarRef} id="dashboard-sidebar" className={`dashboard-sidebar panel ${sidebarOpen ? 'is-open' : 'is-collapsed'}`}>
          <div className="sidebar-heading"><p className="eyebrow">Navigate</p><button type="button" aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'} onClick={() => setSidebarOpen((open) => !open)}>{sidebarOpen ? <>&lsaquo;</> : <>&rsaquo;</>}</button></div>
          <Sidebar />
          <div className="sidebar-live-status">
            <span className={realtimeConnected ? 'live' : ''} />
            {realtimeConnected ? 'System live' : 'Reconnecting'}
          </div>
        </aside>
        <aside className="panel rail">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Conversation hub</p>
              <h2>Launch a workflow</h2>
            </div>
          </div>

          <form className="goal-form" onSubmit={createWorkflow}>
            <label className="field">
              <span>Your goal</span>
              <textarea
                rows={6}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Send an email to John saying I'll be late."
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="primary">
                Create workflow
              </button>
            </div>
          </form>

          <div className="samples">
            <button type="button" className="chip" onClick={() => sample("Send an email to John saying I'll be late.")}>
              Email demo
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => sample('Schedule a meeting with Zhang San next Wednesday.')}
            >
              Meeting demo
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => sample('Research competitor pricing and generate a comparison report.')}
            >
              Research demo
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => sample('Draft a launch brief for the marketing team.')}
            >
              Draft demo
            </button>
            <button type="button" className="chip" onClick={() => sample('Launch our v2 on all social channels')}>
              Social launch demo
            </button>
          </div>

          <div className="preview-card">
            <div className="preview-head">
              <p className="preview-label">Proxima&apos;s read</p>
            </div>
            <GoalUnderstanding intent={lastIntent} goal={inputValue} />
          </div>
        </aside>

        <section className="panel board">
          <div className="panel-header">
            <div>
              <p className="eyebrow with-icon"><Icon name="workflow" size={14} /> Task board</p>
              <h2>Workflow graph</h2>
            </div>
            <span className="muted">{workflows.length} workflows</span>
          </div>

          <div className="workflow-list">
            {workflows.length ? (
              workflows.map((workflow) => (
                <button
                  key={workflow.id}
                  type="button"
                  className={`workflow-card ${workflow.id === selectedId ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedId(workflow.id);
                    setSelectedNode(null);
                  }}
                >
                  <div className="workflow-card-top">
                    <div>
                      <p className="workflow-kicker">{workflow.parsed.action}</p>
                      <h3>{workflow.goalText}</h3>
                    </div>
                    <span className={`pill ${workflow.status === 'waiting_approval' ? 'warn' : workflow.status === 'running' ? 'running' : workflow.status === 'completed' ? 'ok' : workflow.status === 'cancelled' || workflow.status === 'failed' ? 'danger' : 'neutral'}`}>
                      {workflow.status === 'waiting_approval'
                        ? 'Waiting approval'
                        : workflow.status === 'completed'
                          ? 'Completed'
                          : workflow.status === 'running'
                            ? 'Running'
                            : workflow.status === 'cancelled' || workflow.status === 'failed'
                              ? 'Cancelled'
                              : workflow.status === 'failed' ? 'Failed' : 'Draft'}
                    </span>
                  </div>

                  <div className="workflow-progress">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.round(
                            (workflow.steps.filter((step) => step.status === 'done' || step.status === 'skipped').length /
                              Math.max(1, workflow.steps.length)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="workflow-meta">
                      <span>{workflow.steps.length} steps</span>
                      <span>{workflow.artifacts.length} artifacts</span>
                      <span>{new Date(workflow.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="details-empty compact">
                No workflows yet. Submit a goal and Proxima will split it into a visible plan.
              </div>
            )}
          </div>

          <div className="graph-wrapper">
            <DAGVisualizer
              workflow={selectedWorkflow}
              onNodeSelect={(node) => {
                setSelectedNode(node);
                if (node?.step?.isApprovalGate && node.step.status === 'waiting_approval') {
                  setApprovalWorkflow(selectedWorkflow);
                }
              }}
            />
          </div>
          <section className="terminal-panel">
            <div className="panel-header"><div><p className="eyebrow with-icon"><Icon name="activity" size={14} /> Live system log</p><h2>Execution terminal</h2></div></div>
            <TerminalLog entries={selectedWorkflow?.auditTrail || []} />
          </section>
        </section>

        <aside className="stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow with-icon"><Icon name="shield" size={14} /> Approval center</p>
                <h2>Pending gates</h2>
              </div>
            </div>
            <div className="approval-center">
              {pendingApprovals.length ? (
                pendingApprovals.map((workflow) => (
                  <article className="approval-card" key={workflow.id}>
                    <div className="approval-head">
                      <div>
                        <p className="workflow-kicker">Approval required</p>
                        <h3>{workflow.goalText}</h3>
                      </div>
                      <span className="pill warn">Pending</span>
                    </div>
                    <div className="workflow-meta">
                      <span>{workflow.parsed.action}</span>
                      <span>{workflow.steps.length} steps</span>
                    </div>
                    <div className="action-row">
                      <button type="button" className="primary" onClick={() => setApprovalWorkflow(workflow)}>
                        <Icon name="search" size={15} /> Review
                      </button>
                      <button type="button" className="secondary" onClick={() => handleCancel(workflow)}>
                        <Icon name="x" size={15} /> Cancel
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="details-empty compact">No actions are waiting on human approval right now.</div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow with-icon"><Icon name="brain" size={14} /> Memory mesh</p>
                <h2>Known contacts</h2>
              </div>
            </div>
            <div className="memory-list">
              {contacts.length ? (
                contacts.map((contact) => (
                  <article className="memory-item" key={contact.id || `${contact.name}-${contact.email}`}>
                    <div className="memory-dot" />
                    <div>
                      <h4>{contact.name || contact.title || 'Memory'}</h4>
                      <div className="meta">{contact.email || contact.type || 'Context'}</div>
                      <div className="meta" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {contact.notes || contact.content || contact.text || 'No details available'}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="details-empty compact">No contacts available yet.</div>
              )}
            </div>
          </section>
        </aside>
      </section>

      <section className="panel details-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow with-icon"><Icon name="terminal" size={14} /> Execution details</p>
            <h2>Selected run</h2>
          </div>
          <span className="mono muted">{selectedWorkflow ? selectedWorkflow.id : 'No workflow selected'}</span>
        </div>

        {selectedWorkflow ? (
          <div className="detail-layout">
            <section className="detail-summary">
              <div className="detail-title">
                <div>
                  <p className="eyebrow">Goal</p>
                  <div className="goal-text">{selectedWorkflow.goalText}</div>
                </div>
                <div className="action-row">
                  <span
                    className={`pill ${selectedWorkflow.status === 'waiting_approval' ? 'warn' : selectedWorkflow.status === 'running' ? 'running' : selectedWorkflow.status === 'completed' ? 'ok' : selectedWorkflow.status === 'cancelled' ? 'danger' : 'neutral'}`}
                  >
                    {selectedWorkflow.status === 'waiting_approval'
                      ? 'Waiting approval'
                      : selectedWorkflow.status === 'completed'
                        ? 'Completed'
                        : selectedWorkflow.status === 'running'
                          ? 'Running'
                          : selectedWorkflow.status === 'cancelled'
                            ? 'Cancelled'
                            : 'Draft'}
                  </span>
                  <button type="button" className="secondary" onClick={() => handleCancel(selectedWorkflow)}>
                    <Icon name="x" size={15} /> Cancel
                  </button>
                  {selectedWorkflow.status === 'waiting_approval' ? (
                    <button type="button" className="primary" onClick={() => setApprovalWorkflow(selectedWorkflow)}>
                      <Icon name="check" size={15} /> Approve
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="detail-metrics">
                <div className="detail-metric">
                  <span className="metric-label">Progress</span>
                  <span className="metric-value">
                    {Math.round(
                      (selectedWorkflow.steps.filter((step) => step.status === 'done' || step.status === 'skipped').length /
                        Math.max(1, selectedWorkflow.steps.length)) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="detail-metric">
                  <span className="metric-label">Artifacts</span>
                  <span className="metric-value">{selectedWorkflow.artifacts.length}</span>
                </div>
                <div className="detail-metric">
                  <span className="metric-label">Updated</span>
                  <span className="metric-value">
                    {new Date(selectedWorkflow.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </section>

            {selectedNode ? (
              <section className="detail-card">
                <p className="eyebrow">Selected node</p>
                <div className="node-inspector">
                  <strong>{selectedNode.label}</strong>
                  <span>{selectedNode.subtitle}</span>
                </div>
              </section>
            ) : null}

            <section className="detail-grid">
              <article className="detail-card">
                <p className="eyebrow">What Proxima is doing</p>
                <GoalUnderstanding
                  intent={selectedWorkflow.parsed}
                  goal={selectedWorkflow.goalText}
                  tasks={selectedWorkflow.tasks}
                  approvalNeeded={selectedWorkflow.status === 'waiting_approval' || selectedWorkflow.tasks.some((task) => task.isApprovalGate)}
                  detailed
                />
              </article>

              <article className="detail-card">
                <p className="eyebrow">Task graph</p>
                <DAGVisualizer
                  workflow={selectedWorkflow}
                  onNodeSelect={(node) => {
                    setSelectedNode(node);
                    if (node?.step?.isApprovalGate && node.step.status === 'waiting_approval') {
                      setApprovalWorkflow(selectedWorkflow);
                    }
                  }}
                />
              </article>

              <article className="detail-card">
                <p className="eyebrow">Artifacts</p>
                <div className="artifacts">
                  {selectedWorkflow.artifacts.length ? (
                    selectedWorkflow.artifacts.map((artifact) => (
                      <ArtifactCard key={artifact.id} artifact={artifact} onDownload={(nextArtifact) => downloadArtifact(selectedWorkflow, nextArtifact)} />
                    ))
                  ) : (
                    <div className="details-empty compact">No artifacts have been generated yet.</div>
                  )}
                </div>
              </article>

              <article className="detail-card">
                <p className="eyebrow">Audit trail</p>
                <div className="audit">
                  {selectedWorkflow.auditTrail.length ? (
                    selectedWorkflow.auditTrail.slice(0, 8).map((entry) => (
                      <div className="audit-entry" key={entry.id}>
                        <div className="audit-top">
                          <small>{new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                          <span className="pill neutral">{entry.level}</span>
                        </div>
                        <div>{entry.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className="details-empty compact">No audit entries yet.</div>
                  )}
                </div>
              </article>
            </section>
          </div>
        ) : (
          <div className="details-empty">
            Create a workflow to inspect its steps, approvals, artifacts, and audit trail.
          </div>
        )}
      </section>

        <ApprovalModal
          workflow={approvalWorkflow}
          onClose={() => setApprovalWorkflow(null)}
          onApprove={handleApprove}
          onCancel={() => {
            handleCancel(approvalWorkflow);
            setApprovalWorkflow(null);
          }}
        />
      </main>
    </>
  );
}

export default function ProximaDashboard() {
  return (
    <ToastProvider>
      <DashboardShell />
    </ToastProvider>
  );
}
