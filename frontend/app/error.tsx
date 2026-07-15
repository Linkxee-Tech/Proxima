'use client';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="auth-screen"><section className="panel auth-card"><p className="eyebrow">Something went wrong</p><h1>Proxima could not load this view.</h1><button className="primary" onClick={reset}>Try again</button></section></main>; }
