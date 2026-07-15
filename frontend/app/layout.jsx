import './globals.css';
import Providers from '../components/providers/Providers';

export const metadata = {
  title: 'Proxima OS',
  description: 'Approval-first AI workflow operating system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
