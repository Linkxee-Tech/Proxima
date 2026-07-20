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
        <p className="legal-updated">Last updated: July 21, 2026</p>
        <p>By creating an account or using Proxima, you agree to these terms.</p>

        <h2>Using Proxima</h2>
        <p>Proxima helps you organize work, prepare drafts, connect supported services, and review actions before they are sent. Use the service lawfully and only for work you are authorized to perform.</p>

        <h2>Your account</h2>
        <p>You are responsible for protecting your account credentials and for activity performed through your account. Contact us promptly if you believe your account has been accessed without permission.</p>

        <h2>Your content and connected accounts</h2>
        <p>You retain ownership of the material you provide to Proxima. You give us permission to process it only as needed to provide the service. When you connect a third-party account, you confirm that you are allowed to grant the requested permissions and that your use follows that provider&apos;s rules.</p>

        <h2>Reviewing actions</h2>
        <p>Proxima may present drafts or proposed external actions for your review. You are responsible for checking the information, granting approval, and deciding whether a message, post, or other action is appropriate before it is sent.</p>

        <h2>Acceptable use</h2>
        <p>Do not use Proxima to break the law, infringe another person&apos;s rights, distribute harmful material, interfere with the service, or attempt to access accounts, data, or systems without permission.</p>

        <h2>Availability</h2>
        <p>We work to keep Proxima reliable, but the service may change, be interrupted, or be unavailable at times. Features that rely on third-party services may change or stop working when those services change.</p>

        <h2>Important decisions</h2>
        <p>Proxima is software, not legal, medical, financial, or other professional advice. Check important information independently before acting on it.</p>

        <h2>Changes and contact</h2>
        <p>We may update these terms as Proxima develops. Continued use after an update means you accept the revised terms. Questions can be sent to <a href="mailto:muazu0815@gmail.com">muazu0815@gmail.com</a>.</p>
      </article>
    </main>
  );
}
