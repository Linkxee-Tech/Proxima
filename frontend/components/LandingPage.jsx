"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const examples = [
  'Launch our product next Friday',
  "Prepare tomorrow's board meeting",
  'Reply to every customer email',
  'Plan my trip to London',
  'Schedule interviews for next week',
];

export default function LandingPage() {
  const [goal, setGoal] = useState('');
  const router = useRouter();
  const startWorking = (event) => {
    event.preventDefault();
    const request = goal.trim();
    router.push(request ? `/dashboard?goal=${encodeURIComponent(request)}` : '/dashboard');
  };

  return (
    <main className="welcome-shell">
      <div className="welcome-grid" />
      <nav className="welcome-nav" aria-label="Main navigation">
        <Link href="/" className="welcome-brand" aria-label="Proxima home">
          <span className="welcome-logo"><Image src="/proxima-command-mark.png" alt="" width={34} height={34} priority /></span>
          <span>PROXIMA</span>
        </Link>
        <div className="welcome-nav-actions">
          <span className="welcome-status"><i /> Ready when you are</span>
          <Link className="welcome-login" href="/login">Sign in</Link>
          <Link className="welcome-create" href="/register">Create account</Link>
          <Link className="welcome-open" href="/dashboard">Start working <span>&rarr;</span></Link>
        </div>
      </nav>

      <section className="welcome-hero">
        <div className="welcome-copy">
          <p className="welcome-kicker"><span className="live-dot" /> Proxima, your chief of staff</p>
          <h1>Stop managing work.<br /><em>Start finishing it.</em></h1>
          <p className="welcome-description">
            Tell Proxima what you want accomplished. It prepares the work, coordinates your connected apps, asks when it needs your approval, and keeps you up to date while you get on with your day.
          </p>
          <div className="welcome-actions">
            <Link className="welcome-primary" href="/dashboard">Start working <span>&rarr;</span></Link>
            <a className="welcome-secondary" href="#how-it-works">See how it works</a>
          </div>
          <div className="welcome-trust">
            <span>Clear plans</span><span>Your approval first</span><span>Work you can revisit</span>
          </div>
        </div>

        <div className="welcome-preview welcome-assistant-preview" aria-label="Proxima work preview">
          <div className="preview-topbar"><span className="preview-spark">&#10022;</span><span className="preview-title">PROXIMA</span><span className="preview-live"><i /> WORKING</span></div>
          <div className="preview-content">
            <section className="preview-conversation">
              <p className="preview-label">Your request</p>
              <div className="preview-message user"><span>You</span><p>Prepare the Q3 marketing campaign.</p></div>
              <div className="preview-message assistant"><span>&#10022;</span><p>I&apos;ve prepared a plan. I&apos;ll ask before anything is published.</p></div>
              <div className="preview-input"><span>What would you like to accomplish?</span><span className="preview-send" aria-label="Start working">&rarr;</span></div>
            </section>
            <section className="preview-dag">
              <div className="preview-board-head"><p className="preview-label">The plan</p><span>Q3 campaign</span></div>
              <div className="assistant-plan-preview">
                <p><b>✓</b> Gather launch details</p><p><b>✓</b> Draft campaign messages</p><p><b>✓</b> Prepare email and social posts</p><p className="awaiting"><b>!</b> Wait for your approval</p>
              </div>
            </section>
            <section className="preview-sidepanel">
              <p className="preview-label">Working now</p>
              <div className="preview-agents">
                <div className="preview-agent"><span className="agent-icon cyan">01</span><div><strong>Finding campaign context</strong><small className="cyan">Complete</small></div></div>
                <div className="preview-agent"><span className="agent-icon purple">02</span><div><strong>Drafting the announcement</strong><small className="purple">In progress</small></div></div>
                <div className="preview-agent"><span className="agent-icon amber">03</span><div><strong>Ready for your review</strong><small className="amber">Next</small></div></div>
              </div>
              <div className="preview-approval"><p className="preview-label">Your approval</p><strong>Review before publishing</strong><p>You&apos;ll see exactly what will be shared.</p><div><button type="button">Not now</button><button type="button">Review</button></div></div>
            </section>
          </div>
        </div>
      </section>

      <section className="welcome-goal-box" aria-labelledby="landing-goal-title"><div><p className="welcome-kicker">Start with one outcome</p><h2 id="landing-goal-title">What would you like to accomplish today?</h2></div><form onSubmit={startWorking}><input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Prepare tomorrow’s board meeting" aria-label="What would you like to accomplish today?" /><button type="submit">Start working <span>→</span></button></form><div className="welcome-examples" aria-label="Example requests"><p>Try one:</p>{examples.map((example) => <button type="button" key={example} onClick={() => setGoal(example)}>{example}</button>)}</div></section>

      <section className="welcome-features" id="how-it-works">
        <div className="how-it-works-intro"><p className="welcome-kicker">A calmer way to get work done</p><h2>Give the outcome. Keep the control.</h2><p>From one sentence to a finished result, Proxima keeps the plan simple and asks for your decision only when it matters.</p></div>
        <div className="how-it-works-grid">
          <article><span>01 / ASK</span><div className="feature-icon">&#10022;</div><h3>Describe the outcome</h3><p>Start with a plain-language request. Proxima turns it into a simple plan and prepares the next steps.</p><small>Example: “Research competitor pricing and prepare a report.”</small></article>
          <article><span>02 / FOLLOW</span><div className="feature-icon">&#9678;</div><h3>See what is happening</h3><p>Follow progress in clear language: what is ready, what is in motion, and what needs your attention.</p><small>You can check in any time without managing the details.</small></article>
          <article><span>03 / APPROVE</span><div className="feature-icon">&#10003;</div><h3>Make the final call</h3><p>Important actions pause until you have reviewed what will happen next.</p><small>You stay in control of anything that goes outside Proxima.</small></article>
        </div>
      </section>
      <footer className="welcome-footer"><span>© 2026 Proxima</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
    </main>
  );
}
