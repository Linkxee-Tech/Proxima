import Image from 'next/image';
import AuthGate from '../../components/AuthGate';
import Link from 'next/link';

export default function LoginPage() {
  return <AuthGate forcePrompt redirectTo="/dashboard"><main className="auth-screen"><div className="auth-card panel"><Link className="auth-brand" href="/" aria-label="Return to Proxima landing page"><Image src="/proxima-command-mark.png" alt="" width={38} height={38} priority /><span>PROXIMA</span></Link><p className="eyebrow">Workspace access</p><h1>You&apos;re signed in.</h1><p className="lede">Your Proxima command center is ready.</p><Link className="welcome-primary" href="/dashboard">Open workspace &rarr;</Link><Link className="auth-home-link" href="/">Back to landing page</Link></div></main></AuthGate>;
}
