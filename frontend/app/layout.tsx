import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/providers/ToastProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Shipyard - Continuous Deployment Platform',
  description: 'Automated continuous deployment platform with continuous metric verification and AI-driven rollback diagnosis.',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-[#0a0a0f] text-[#f1f5f9] flex flex-col font-sans">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
