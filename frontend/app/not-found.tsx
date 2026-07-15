import Link from 'next/link';
export default function NotFound() { return <main className="auth-screen"><section className="panel auth-card"><p className="eyebrow">404</p><h1>That workspace view does not exist.</h1><Link className="primary" href="/dashboard">Back to dashboard</Link></section></main>; }
