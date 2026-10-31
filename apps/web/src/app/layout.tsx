import type { Metadata, Viewport } from 'next';
import { Onest } from 'next/font/google';
import './globals.css';

const onest = Onest({ subsets: ['latin', 'cyrillic'], variable: '--font-onest' });

export const metadata: Metadata = {
  title: 'smart-transit',
  description: 'Bakı avtobusları: real vaxt ETA və sərnişin sıxlığı',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0154E2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={onest.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
