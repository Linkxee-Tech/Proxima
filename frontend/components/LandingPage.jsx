import Link from 'next/link';
import Image from 'next/image';

const steps = [
  ['01', 'Intent parsed', 'completed'],
  ['02', 'Research brief', 'completed'],
  ['03', 'Draft campaign', 'running'],
  ['04', 'Approval gate', 'awaiting'],
];

const agents = [
  ['PM', 'PM Agent', 'Planning', 'cyan'],
  ['R', 'Researcher', 'Complete', 'green'],
  ['W', 'Writer Agent', 'Drafting', 'purple'],
  ['O', 'Operator', 'Waiting', 'amber'],
];

export default function LandingPage() {
  return (
    <main className="welcome-shell">
      <div className="welcome-grid" />
      <nav className="welcome-nav" aria-label="Main navigation">
        <Link href="/" className="welcome-brand" aria-label="Proxima home">
          <span className="welcome-logo"><Image src="/proxima-command-mark.png" alt="" width={34} height={34} priority /></span>
          <span>PROXIMA</span>
        </Link>
        <div className="welcome-nav-actions">
          <span className="welcome-status"><i /> System ready</span>
          <Link className="welcome-login" href="/login">Sign in</Link>
          <Link className="welcome-create" href="/register">Create account</Link>
          <Link className="welcome-open" href="/dashboard">Open workspace <span>&rarr;</span></Link>
        </div>
      </nav>

      <section className="welcome-hero">
        <div className="welcome-copy">
          <p className="welcome-kicker"><span className="live-dot" /> Approval-first AI operations</p>
          <h1>Give every AI task<br /><em>a command center.</em></h1>
          <p className="welcome-description">
            Proxima turns a single goal into a live workflow you can inspect, steer, and approve before important work reaches the outside world.
          </p>
          <div className="welcome-actions">
            <Link className="welcome-primary" href="/dashboard">Open command center <span>&rarr;</span></Link>
            <a className="welcome-secondary" href="#how-it-works">See how it works</a>
          </div>
          <div className="welcome-trust">
            <span>Visible task DAGs</span>
            <span>Human approval gates</span>
            <span>Durable workflow history</span>
          </div>
        </div>

        <div className="welcome-preview" aria-label="Proxima workspace preview">
          <div className="preview-topbar">
            <span className="preview-spark">&#10022;</span>
            <span className="preview-title">PROXIMA / COMMAND CENTER</span>
            <span className="preview-live"><i /> LIVE</span>
          </div>
          <div className="preview-content">
            <section className="preview-conversation">
              <p className="preview-label">Conversation hub</p>
              <div className="preview-message user"><span>Y</span><p>Prepare the Q3 marketing campaign.</p></div>
              <div className="preview-message assistant"><span>&#10022;</span><p>I&apos;ve created a plan. One action needs your approval.</p></div>
              <div className="preview-input"><span>Type a goal...</span><span className="preview-send" aria-label="Send goal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.4 18-3.5-7.1L3 10.4 21 3Z" /><path d="m10.1 13.9 4.6-4.6" /></svg></span></div>
            </section>
            <section className="preview-dag">
              <div className="preview-board-head"><p className="preview-label">Task board (DAG)</p><span>Q3 Campaign</span></div>
              <div className="preview-path" />
              {steps.map(([number, title, status], index) => (
                <article className={`preview-step step-${index + 1}`} key={number}>
                  <span>{number}</span><strong>{title}</strong><small className={status}>{status === 'awaiting' ? 'Needs approval' : status}</small>
                </article>
              ))}
            </section>
            <section className="preview-sidepanel">
              <p className="preview-label">Agent status</p>
              <div className="preview-agents">
                {agents.map(([icon, name, state, tone]) => <div className="preview-agent" key={name}>
                  <span className={`agent-icon ${tone}`}>{icon}</span><div><strong>{name}</strong><small className={tone}>{state}</small></div>
                </div>)}
              </div>
              <div className="preview-approval">
                <p className="preview-label">Approval center</p>
                <strong>High-impact action</strong>
                <p>Send campaign email to 1,200 recipients</p>
                <div><button type="button">Deny</button><button type="button">Review</button></div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="welcome-features" id="how-it-works">
        <div className="how-it-works-intro">
          <p className="welcome-kicker">A calmer way to automate</p>
          <h2>How Proxima keeps you in control.</h2>
          <p>From a single sentence to an approved outcome, each stage is visible and understandable—no hidden automation and no technical workflow builder.</p>
        </div>
        <div className="how-it-works-grid">
          <article><span>01 / ORCHESTRATE</span><div className="feature-icon">&#10022;</div><h3>Describe the outcome</h3><p>Start with a plain-language goal. Proxima turns it into an easy-to-read plan with the right tools and people involved.</p><small>Example: “Research competitor pricing and prepare a report.”</small></article>
          <article><span>02 / OBSERVE</span><div className="feature-icon">&#9678;</div><h3>Watch work take shape</h3><p>Follow agent progress, task branches, generated files, and key decisions in one live command center.</p><small>See what is finished, what is running, and what needs attention.</small></article>
          <article><span>03 / APPROVE</span><div className="feature-icon">&#10003;</div><h3>Approve with confidence</h3><p>Messages, publishing, and other high-impact actions pause until you have reviewed the exact next step.</p><small>You always make the final call before anything goes outside Proxima.</small></article>
        </div>
      </section>
    </main>
  );
}
