import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Transit',
  description: 'Bakı avtobusları: real vaxt ETA və sərnişin sıxlığı',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0154E2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body className="font-sans">{children}</body>
    </html>
  );
}
