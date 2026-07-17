import AuthGate from '../../components/AuthGate';
import Link from 'next/link';

export default function LoginPage() {
  return <AuthGate forcePrompt redirectTo="/dashboard"><main className="auth-screen"><div className="auth-card panel"><p className="eyebrow">Workspace access</p><h1>You&apos;re signed in.</h1><p className="lede">Your Proxima command center is ready.</p><Link className="welcome-primary" href="/dashboard">Open workspace &rarr;</Link></div></main></AuthGate>;
}
