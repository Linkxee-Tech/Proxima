import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Proxima',
  description: 'How Proxima handles account, workflow, and connected-service data.',
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
        <p className="legal-updated">Last updated: July 19, 2026</p>
        <p>This policy explains what Proxima stores when you use the service and how that information is used.</p>

        <h2>Information Proxima collects</h2>
        <p>We collect the information needed to operate your account and the workflows you create. This can include your email address, authentication details, workflow requests, generated drafts, approval history, uploaded files, and service settings.</p>
        <p>If you connect a third-party service such as Google, Slack, X, Facebook, LinkedIn, or Notion, Proxima stores the authorization information needed for that connection. Access and refresh tokens are encrypted before they are stored.</p>

        <h2>How information is used</h2>
        <p>We use this information to authenticate you, run the workflows you request, display your history and approvals, maintain service security, and investigate faults or misuse. We do not sell personal information.</p>

        <h2>Connected services</h2>
        <p>When you choose to connect a service, that provider receives the permissions you approve during its consent flow. The provider&apos;s own privacy policy governs its handling of information after it is shared with that provider. You can disconnect a service from Proxima at any time.</p>

        <h2>Cookies and session data</h2>
        <p>Proxima uses secure, HTTP-only session cookies to keep you signed in. These cookies are used for authentication and service security, not advertising.</p>

        <h2>Data retention and security</h2>
        <p>Account and workflow information is retained while your account is active or while it is needed to operate and protect the service. We use reasonable technical safeguards, including password hashing and encryption for stored OAuth tokens. No internet service can guarantee absolute security.</p>

        <h2>Your choices</h2>
        <p>You can review connected services in the application and disconnect them when you no longer want Proxima to have access. For account or privacy questions, contact us at <a href="mailto:muazu0815@gmail.com">muazu0815@gmail.com</a>.</p>

        <h2>Changes to this policy</h2>
        <p>We may update this policy as the service changes. The date at the top of this page shows when it was last revised.</p>
      </article>
    </main>
  );
}
