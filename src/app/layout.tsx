import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/firebase/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { PageTransition } from '@/components/ui/PageTransition';

export const metadata: Metadata = {
  title: 'NEXUS Studio — Strategy, Design & Engineering',
  description: 'We are an award-winning studio pushing the boundaries of strategy, design, and engineering to build digital products people love.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=cabinet-grotesk@400,500,700,800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-ink-950 font-body text-mist-100 overflow-x-hidden antialiased selection:bg-signal selection:text-ink-950">
        <AuthProvider>
          {children}
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
