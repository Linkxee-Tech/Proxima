import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Proxima',
  description: 'How Proxima handles account and service data.',
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <nav className="legal-nav" aria-label="Legal page navigation">
        <Link href="/" className="legal-brand">PROXIMA</Link>
        <div><Link href="/terms">Terms</Link><Link href="/">Home</Link></div>
      </nav>
      <article className="legal-card">
        <p className="legal-kicker">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: July 21, 2026</p>
        <p>This policy explains what Proxima stores, why it is needed, and the choices available to you.</p>

        <h2>Information we store</h2>
        <p>Proxima stores the information needed to provide your account and the work you ask it to prepare. This may include your email address, sign-in records, requests, drafts, approvals, saved preferences, uploaded files, and service settings.</p>
        <p>When you connect a third-party service, Proxima stores the connection details needed to maintain that link. Access credentials for connected services are encrypted before storage.</p>

        <h2>How we use information</h2>
        <p>We use this information to provide the service, keep your account secure, show your work history, deliver approved actions, and diagnose service problems. We do not sell personal information.</p>

        <h2>Connected services</h2>
        <p>You decide whether to connect a third-party service. That provider receives the permissions you approve during its sign-in process, and its own privacy policy applies to information handled on its platform. You can disconnect a service from Proxima whenever you choose.</p>

        <h2>Session data</h2>
        <p>Proxima uses secure, HTTP-only cookies to maintain your signed-in session. These cookies are used for account access and security, not advertising.</p>

        <h2>Retention and security</h2>
        <p>We retain account and service information while your account is active or while it is needed to operate and protect Proxima. We use reasonable safeguards, including password hashing and encrypted storage for connected-service credentials. No online service can promise absolute security.</p>

        <h2>Your choices</h2>
        <p>You can review or remove connected services from the application. For account or privacy questions, contact <a href="mailto:muazu0815@gmail.com">muazu0815@gmail.com</a>.</p>

        <h2>Changes to this policy</h2>
        <p>We may update this policy as Proxima changes. The date above shows when it was last revised.</p>
      </article>
    </main>
  );
}
