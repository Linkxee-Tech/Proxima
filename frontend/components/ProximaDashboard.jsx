'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from './Sidebar';
import ApprovalModal from './ApprovalModal';
import DAGVisualizer from './DAGVisualizer';
import ArtifactCard from './ArtifactCard';
import TerminalLog from './TerminalLog';
import MissionTimeline from './MissionTimeline';
import CompletionScreen from './CompletionScreen';
import Icon from './Icon';
import { ToastProvider, useToast } from './ToastProvider';
import { apiFetch } from '../lib/proxima-api';

function titleCase(value = '') {
  return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function firstNameFromEmail(email = '') {
  const firstPart = String(email).split('@')[0].split(/[._-]/)[0].trim();
  return firstPart ? firstPart.charAt(0).toUpperCase() + firstPart.slice(1) : '';
}

function progressFor(workflow) {
  if (!workflow?.steps?.length) return 0;
  return Math.round((workflow.steps.filter((step) => step.status === 'done' || step.status === 'skipped').length / workflow.steps.length) * 100);
}

function humanStepTitle(step = {}) {
  const title = String(step.title || '').toLowerCase();
  if (step.isApprovalGate || title.includes('approval')) return 'Waiting for your approval';
  if (title.includes('intent') || title.includes('parse')) return 'Understanding your request';
  if (title.includes('draft')) return 'Drafting the message';
  if (title.includes('tailor') || title.includes('platform')) return 'Preparing the right version for each app';
  return step.title || 'Preparing the next step';
}

function WorkTimeline({ workflow }) {
  const steps = workflow?.steps || [];
  if (!steps.length) return null;
  return <ol className="work-timeline">{steps.map((step) => {
    const state = step.status === 'done' || step.status === 'skipped' ? 'done' : step.status === 'waiting_approval' ? 'waiting' : 'current';
    return <li className={state} key={step.id || step.title}><span aria-hidden="true">{state === 'done' ? '✓' : state === 'waiting' ? '!' : '•'}</span>{humanStepTitle(step)}</li>;
  })}</ol>;
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
          <strong>{social ? 'Campaign plan' : 'Your plan'}</strong>
          <span>{titleCase(intent.action || 'automation')}</span>
        </div>
        <span className={`understanding-safety ${needsApproval ? 'approval' : 'safe'}`}>
          {needsApproval ? 'I will ask before sharing' : 'Ready to prepare'}
        </span>
      </div>
      <p className="understanding-summary">{intent.summary || goal || 'Proxima is preparing your request.'}</p>
      {channels.length ? <div className="understanding-chips">{channels.map((channel) => <span key={channel}>{titleCase(channel)}</span>)}</div> : null}
      <ol className="understanding-steps">
        {steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
      </ol>
      {needsApproval ? <p className="understanding-note">No external action will happen until you review and approve it.</p> : null}
    </div>
  );
}

function WorkProductPreview({ workProduct }) {
  if (!workProduct?.content) return null;
  return (
    <section className="prepared-work" aria-label="Prepared work preview">
      <div className="prepared-work-head">
        <div>
          <p className="preview-label">Prepared for your review</p>
          <h3>{workProduct.title || 'Draft'}</h3>
        </div>
        <span>{titleCase(workProduct.type || 'draft')}</span>
      </div>
      <p className="prepared-work-note">Review and edit the request if any details need to change. Nothing has been sent or scheduled.</p>
      <pre>{workProduct.content}</pre>
    </section>
  );
}

function DashboardShell() {
  const { pushToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [accountName, setAccountName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [preparingPlan, setPreparingPlan] = useState(false);
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
    apiFetch('/api/auth/me').then((result) => setAccountName(firstNameFromEmail(result.user?.email))).catch(() => setAccountName(''));
  }, []);

  useEffect(() => {
    const sharedGoal = searchParams.get('goal');
    if (sharedGoal) setInputValue(sharedGoal);
  }, [searchParams]);

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

  useEffect(() => { setPlanReady(false); }, [inputValue]);

  useEffect(() => {
    const collapseOnOutsideClick = (event) => {
      if (!sidebarOpen) return;
      if (sidebarRef.current?.contains(event.target) || navToggleRef.current?.contains(event.target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('pointerdown', collapseOnOutsideClick);
    return () => document.removeEventListener('pointerdown', collapseOnOutsideClick);
  }, [sidebarOpen]);

  const preparePlan = async (event) => {
    event.preventDefault();
    const goalText = inputValue.trim();
    if (!goalText) return;

    setPreparingPlan(true);
    try {
      const intent = await apiFetch('/api/intent', { method: 'POST', body: JSON.stringify({ goalText }) });
      setLastIntent(intent);
      setPlanReady(true);
    } catch (err) {
      setLastIntent({ error: err.message, text: goalText });
      pushToast(err.message || 'I could not prepare a plan yet.', 'error');
    } finally { setPreparingPlan(false); }
  };

  const createWorkflow = async () => {
    const goalText = inputValue.trim();
    if (!goalText) return;

    try {
      const workflow = await apiFetch('/api/workflows', {
        method: 'POST',
        body: JSON.stringify({ goalText, preparedWork: lastIntent?.workProduct }),
      });
      setWorkflows((current) => [workflow, ...current.filter((item) => item.id !== workflow.id)]);
      setSelectedId(workflow.id);
      setSelectedNode(null);
      setLastIntent(workflow.parsed);
      pushToast('I have prepared the work and will keep you updated.', 'success');
      await loadDashboard(true);
      setInputValue('');
      setPlanReady(false);
    } catch (err) {
      pushToast(err.message || 'I could not start this work.', 'error');
    }
  };

  const saveDraft = async () => {
    const goalText = inputValue.trim();
    if (!goalText) return;
    try {
      const draft = await apiFetch('/api/workflows/drafts', {
        method: 'POST',
        body: JSON.stringify({ goalText, preparedWork: lastIntent?.workProduct }),
      });
      setWorkflows((current) => [draft, ...current.filter((item) => item.id !== draft.id)]);
      setSelectedId(draft.id);
      pushToast('Saved to Drafts. You can start it whenever you are ready.', 'success');
      await loadDashboard(true);
      setInputValue('');
      setPlanReady(false);
    } catch (err) {
      pushToast(err.message || 'I could not save this draft.', 'error');
    }
  };

  const handleApprove = async () => {
    if (!approvalWorkflow) return;

    try {
      await apiFetch(`/api/workflows/${approvalWorkflow.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ all: Boolean(approvalWorkflow.socialDrafts) }),
      });
      pushToast('Thank you. I will continue from here.', 'success');
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
      pushToast('This work has been cancelled.', 'warning');
      setApprovalWorkflow(null);
      await loadDashboard(true);
    } catch (err) {
      pushToast(err.message || 'Cancellation failed', 'error');
    }
  };

  const handleDefer = async () => {
    const approvalStep = approvalWorkflow?.steps?.find((step) => step.isApprovalGate && step.status === 'waiting_approval');
    if (!approvalWorkflow || !approvalStep) return;
    try {
      await apiFetch(`/api/approvals/${approvalWorkflow.id}:${approvalStep.id}/defer`, { method: 'POST', body: '{}' });
      pushToast('Saved for later. Nothing has been changed outside Proxima.', 'info');
      setApprovalWorkflow(null);
      await loadDashboard(true);
    } catch (err) {
      pushToast(err.message || 'I could not defer this decision.', 'error');
    }
  };

  const startDraft = async (workflow) => {
    if (!workflow || workflow.status !== 'draft') return;
    try {
      const started = await apiFetch(`/api/workflows/${workflow.id}/start`, { method: 'POST', body: '{}' });
      setWorkflows((current) => [started, ...current.filter((item) => item.id !== started.id)]);
      setSelectedId(started.id);
      pushToast('Your saved draft is now underway.', 'success');
      await loadDashboard(true);
    } catch (err) {
      pushToast(err.message || 'I could not start this draft.', 'error');
    }
  };

  const resumeDeferred = async (workflow) => {
    const approvalStep = workflow?.steps?.find((step) => step.isApprovalGate && step.status === 'deferred');
    if (!workflow || !approvalStep) return;
    try {
      const resumed = await apiFetch(`/api/approvals/${workflow.id}:${approvalStep.id}/resume`, { method: 'POST', body: '{}' });
      setWorkflows((current) => [resumed, ...current.filter((item) => item.id !== resumed.id)]);
      setApprovalWorkflow(resumed);
      await loadDashboard(true);
    } catch (err) {
      pushToast(err.message || 'I could not reopen this decision.', 'error');
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
      pushToast('Example added. You can change it before starting.', 'info');
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
            <p className="eyebrow">Your chief of staff</p>
            <h1>PROXIMA</h1>
          </div>
        </div>
        <nav className="command-tabs" aria-label="Workspace sections">
          <a className="active" href="/dashboard">Home</a>
          <a href="/dashboard/approvals">Approvals {pendingApprovals.length ? `(${pendingApprovals.length})` : ''}</a>
          <a href="/dashboard/work">My Work</a>
          <a href="/dashboard/integrations">Connected Apps</a>
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
          <p className="eyebrow">{greeting()}{accountName ? `, ${accountName}` : ''} 👋</p>
          <h2>What can I help you accomplish today?</h2>
          <p className="lede">
            Share an outcome. I&apos;ll prepare a clear plan, handle the details, and ask when your decision is needed.
          </p>
          <div className="hero-chips">
            <span className="chip subtle">Clear plans</span>
            <span className="chip subtle">Your approval first</span>
            <span className="chip subtle">Connected apps</span>
          </div>
        </div>
        <div className="hero-stats">
          {[
            { label: 'My work', value: metrics?.total || 0 },
            { label: 'Working now', value: metrics?.running || 0 },
            { label: 'Needs approval', value: metrics?.waitingApproval || 0 },
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
            {realtimeConnected ? 'Ready to help' : 'Reconnecting'}
          </div>
        </aside>
        <aside className="panel rail">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Start here</p>
              <h2>Tell me what you need</h2>
            </div>
          </div>

          <form className="goal-form" onSubmit={preparePlan}>
            <label className="field">
              <span>What would you like to accomplish today?</span>
              <textarea
                rows={6}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Prepare tomorrow's board meeting"
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="primary" disabled={preparingPlan || !inputValue.trim()}>
                {preparingPlan ? 'Preparing your plan…' : 'Start working'}
              </button>
            </div>
          </form>

          <div className="samples">
            <button type="button" className="chip" onClick={() => sample("Send an email to John saying I'll be late.")}>
              Reply to an email
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => sample('Schedule a meeting with Zhang San next Wednesday.')}
            >
              Plan a meeting
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => sample('Research competitor pricing and generate a comparison report.')}
            >
              Research a market
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => sample('Write a proposal for a customer onboarding improvement project.')}
            >
              Write a proposal
            </button>
            <button type="button" className="chip" onClick={() => sample('Launch our product on all social channels')}>
              Plan a launch
            </button>
          </div>

          <p className="samples-hint">Or describe any other office task above — for example, prepare a client update, organise a project handover, or create a status report.</p>

          <div className={`preview-card ${planReady ? 'plan-ready' : ''}`}>
            <div className="preview-head"><p className="preview-label">{planReady ? 'Goal received' : 'Here’s the plan'}</p></div>
            {planReady ? <><p className="plan-ready-title">I’ve prepared the next steps and a working draft.</p><GoalUnderstanding intent={lastIntent} goal={inputValue} /><WorkProductPreview workProduct={lastIntent?.workProduct} /><div className="action-row plan-actions"><button type="button" className="primary" onClick={createWorkflow}>Start this work</button><button type="button" className="secondary" onClick={saveDraft}>Save as draft</button><button type="button" className="ghost" onClick={() => setPlanReady(false)}>Edit plan</button></div></> : <GoalUnderstanding intent={lastIntent} goal={inputValue} />}
          </div>
        </aside>

        <section className="panel board">
          <div className="panel-header">
            <div>
              <p className="eyebrow with-icon"><Icon name="workflow" size={14} /> Recent work</p>
              <h2>What I&apos;m working on</h2>
            </div>
            <span className="muted">{workflows.length} items</span>
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
                        ? 'Needs your approval'
                        : workflow.status === 'completed'
                          ? 'Completed'
                          : workflow.status === 'running'
                            ? 'Working'
                            : workflow.status === 'cancelled'
                              ? 'Cancelled'
                              : workflow.status === 'failed' ? 'Could not finish' : 'Draft'}
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
                      <span>{workflow.steps.length} items</span>
                      <span>{workflow.artifacts.length} results</span>
                      <span>{new Date(workflow.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="details-empty compact">
                Nothing is in progress yet. Tell Proxima what you want to accomplish to get started.
              </div>
            )}
          </div>

          {selectedWorkflow ? <section className="work-progress-card">
            <div><p className="eyebrow">{selectedWorkflow.status === 'completed' ? 'Done 🎉' : selectedWorkflow.status === 'waiting_approval' ? 'Waiting for you' : selectedWorkflow.status === 'draft' ? 'Saved for later' : selectedWorkflow.status === 'deferred' ? 'Decision deferred' : 'Working now'}</p><h3>{selectedWorkflow.goalText}</h3><p className="muted">{selectedWorkflow.status === 'waiting_approval' ? 'I need your approval before I continue.' : selectedWorkflow.status === 'completed' ? 'Everything for this request is ready.' : selectedWorkflow.status === 'draft' ? 'This plan is saved and has not started.' : selectedWorkflow.status === 'deferred' ? 'This decision is saved for later.' : selectedWorkflow.status === 'cancelled' ? 'This request was cancelled.' : 'I’m preparing the next steps.'}</p></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${progressFor(selectedWorkflow)}%` }} /></div>
            <MissionTimeline work={selectedWorkflow} />
            <div className="workflow-meta"><span>{progressFor(selectedWorkflow)}% ready</span><span>{selectedWorkflow.steps.length} steps</span><button type="button" className="ghost" onClick={() => setShowAdvanced((visible) => !visible)}>{showAdvanced ? 'Hide details' : 'View details'}</button></div>
          </section> : null}
          {showAdvanced ? <section className="advanced-work-details">
            <div className="graph-wrapper"><DAGVisualizer workflow={selectedWorkflow} onNodeSelect={(node) => { setSelectedNode(node); if (node?.step?.isApprovalGate && node.step.status === 'waiting_approval') setApprovalWorkflow(selectedWorkflow); }} /></div>
            <section className="terminal-panel"><div className="panel-header"><div><p className="eyebrow with-icon"><Icon name="activity" size={14} /> Detailed activity</p><h2>Work history</h2><p className="muted">Saved updates from this request.</p></div></div><TerminalLog entries={selectedWorkflow?.auditTrail || []} /></section>
          </section> : null}
        </section>

        <aside className="stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow with-icon"><Icon name="shield" size={14} /> Your decisions</p>
                <h2>Needs your approval</h2>
              </div>
            </div>
            <div className="approval-center">
              {pendingApprovals.length ? (
                pendingApprovals.map((workflow) => (
                  <article className="approval-card" key={workflow.id}>
                    <div className="approval-head">
                      <div>
                        <p className="workflow-kicker">I need your approval</p>
                        <h3>{workflow.goalText}</h3>
                      </div>
                      <span className="pill warn">Review needed</span>
                    </div>
                    <div className="workflow-meta">
                      <span>{workflow.parsed.action}</span>
                      <span>{workflow.steps.length} planned steps</span>
                    </div>
                    <div className="action-row">
                      <button type="button" className="primary" onClick={() => setApprovalWorkflow(workflow)}>
                        <Icon name="search" size={15} /> Review it
                      </button>
                      <button type="button" className="secondary" onClick={() => handleCancel(workflow)}>
                        <Icon name="x" size={15} /> Cancel
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="details-empty compact">Nothing needs your approval right now.</div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow with-icon"><Icon name="brain" size={14} /> What I remember</p>
                <h2>Useful context</h2>
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

      <section id="work-details" className="panel details-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow with-icon"><Icon name="target" size={14} /> Work details</p>
            <h2>Your request</h2>
          </div>
          <span className="mono muted">{selectedWorkflow ? selectedWorkflow.id : 'No work selected'}</span>
        </div>

        {selectedWorkflow ? (
          <div className="detail-layout">
            <section className="detail-summary">
              <div className="detail-title">
                <div>
            <p className="eyebrow">What you asked for</p>
                  <div className="goal-text">{selectedWorkflow.goalText}</div>
                </div>
                <div className="action-row">
                  <span
                    className={`pill ${selectedWorkflow.status === 'waiting_approval' ? 'warn' : selectedWorkflow.status === 'running' ? 'running' : selectedWorkflow.status === 'completed' ? 'ok' : selectedWorkflow.status === 'cancelled' ? 'danger' : 'neutral'}`}
                  >
                    {selectedWorkflow.status === 'waiting_approval'
                      ? 'Needs your approval'
                      : selectedWorkflow.status === 'completed'
                        ? 'Completed'
                        : selectedWorkflow.status === 'running'
                        ? 'Working'
                          : selectedWorkflow.status === 'cancelled'
                            ? 'Cancelled'
                            : 'Draft'}
                  </span>
                  <button type="button" className="secondary" onClick={() => handleCancel(selectedWorkflow)}>
                    <Icon name="x" size={15} /> Cancel work
                  </button>
                  {selectedWorkflow.status === 'waiting_approval' ? (
                    <button type="button" className="primary" onClick={() => setApprovalWorkflow(selectedWorkflow)}>
                      <Icon name="check" size={15} /> Approve and continue
                    </button>
                  ) : null}
                  {selectedWorkflow.status === 'draft' ? (
                    <button type="button" className="primary" onClick={() => startDraft(selectedWorkflow)}>
                      <Icon name="play" size={15} /> Start this work
                    </button>
                  ) : null}
                  {selectedWorkflow.status === 'deferred' ? (
                    <button type="button" className="primary" onClick={() => resumeDeferred(selectedWorkflow)}>
                      <Icon name="clock" size={15} /> Review now
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="detail-metrics">
                <div className="detail-metric">
                  <span className="metric-label">Ready</span>
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
                  <span className="metric-label">Results</span>
                  <span className="metric-value">{selectedWorkflow.artifacts.length}</span>
                </div>
                <div className="detail-metric">
                  <span className="metric-label">Last update</span>
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
                <p className="eyebrow">The plan</p>
                <GoalUnderstanding
                  intent={selectedWorkflow.parsed}
                  goal={selectedWorkflow.goalText}
                  tasks={selectedWorkflow.tasks}
                  approvalNeeded={selectedWorkflow.status === 'waiting_approval' || selectedWorkflow.tasks.some((task) => task.isApprovalGate)}
                  detailed
                />
              </article>

              <article className="detail-card">
                <p className="eyebrow">Ready for you</p>
                <div className="artifacts">
                  {selectedWorkflow.artifacts.length ? (
                    selectedWorkflow.artifacts.map((artifact) => (
                      <ArtifactCard key={artifact.id} artifact={artifact} onDownload={(nextArtifact) => downloadArtifact(selectedWorkflow, nextArtifact)} />
                    ))
                  ) : (
                    <div className="details-empty compact">Nothing is ready to review yet.</div>
                  )}
                </div>
              </article>

            </section>
            <CompletionScreen work={selectedWorkflow} onViewDetails={() => document.getElementById('work-details')?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
        ) : (
          <div className="details-empty">
            Start with a request and Proxima will keep the plan and results here.
          </div>
        )}
      </section>

        <ApprovalModal
          workflow={approvalWorkflow}
          onClose={() => setApprovalWorkflow(null)}
          onApprove={handleApprove}
          onDefer={handleDefer}
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
