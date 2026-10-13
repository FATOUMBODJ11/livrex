import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Header from '@/components/Header';
import { StoreProvider } from '@/lib/store';
import './globals.css';

export const metadata: Metadata = {
  title: 'Afrique Express Services',
  description: 'Voyageurs, fret routier et livraison express LIVREX au Sénégal. Prototype fonctionnel.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" />
      </head>
      <body>
        <Header />
        <StoreProvider>
          <main>{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
