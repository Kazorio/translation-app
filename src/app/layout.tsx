import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'biTranslation | Live Dolmetscher',
  description:
    'Bidirektionale Push-to-Talk Übersetzung für natürliche Gespräche zwischen zwei Sprachen.',
};

export default function RootLayout({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <html lang="de" className={plex.className}>
      <body>{children}</body>
    </html>
  );
}
