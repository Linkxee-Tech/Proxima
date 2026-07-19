import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | Proxima',
  description: 'Terms for using Proxima.',
};

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <nav className="legal-nav" aria-label="Legal page navigation">
        <Link href="/" className="legal-brand">PROXIMA</Link>
        <div><Link href="/privacy">Privacy</Link><Link href="/">Home</Link></div>
      </nav>
      <article className="legal-card">
        <p className="legal-kicker">Legal</p>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: July 19, 2026</p>
        <p>By creating an account or using Proxima, you agree to these terms.</p>

        <h2>Using Proxima</h2>
        <p>Proxima helps you organize work, create drafts, connect supported services, and review workflow steps. You must use the service lawfully and only for work you are authorized to perform.</p>

        <h2>Your account</h2>
        <p>You are responsible for keeping your account credentials secure and for activity performed through your account. Tell us promptly if you believe your account has been accessed without your permission.</p>

        <h2>Your content and connected accounts</h2>
        <p>You keep ownership of the material you provide to Proxima. You give us permission to process it only as needed to provide the service. When you connect a third-party account, you confirm that you are authorized to grant the requested permissions and that your use follows that provider&apos;s rules.</p>

        <h2>Approvals and responsibility</h2>
        <p>Proxima may present workflow steps, drafts, or proposed external actions for review. You are responsible for checking information, granting approvals, and deciding whether any message, post, or other action is appropriate before it is sent.</p>

        <h2>Acceptable use</h2>
        <p>Do not use Proxima to break the law, infringe another person&apos;s rights, distribute harmful material, interfere with the service, or attempt to gain unauthorized access to accounts, data, or systems.</p>

        <h2>Availability</h2>
        <p>We work to keep Proxima available and reliable, but the service may change, be interrupted, or be unavailable at times. Features that depend on third-party providers may change or stop working when those providers change their services.</p>

        <h2>No professional advice</h2>
        <p>Proxima provides software tools and generated content. It does not provide legal, medical, financial, or other professional advice. Verify important information independently before acting on it.</p>

        <h2>Changes and contact</h2>
        <p>We may update these terms as Proxima develops. Continued use after an update means you accept the revised terms. Questions can be sent to <a href="mailto:muazu0815@gmail.com">muazu0815@gmail.com</a>.</p>
      </article>
    </main>
  );
}
