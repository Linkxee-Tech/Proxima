import './globals.css';
import Providers from '../components/providers/Providers';

export const metadata = {
  title: 'Proxima — Your Chief of Staff',
  description: 'Plan work, stay in control, and finish more with Proxima.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
