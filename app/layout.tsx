import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://energy-atlas-switzerland.royal-hare-6289.chatgpt.site'),
  title: 'Energy Atlas — Svizzera 1965–2023',
  description:
    'Due esplorazioni interattive del mix energetico svizzero, dal 1965 al 2023.',
  openGraph: {
    title: 'Energy Atlas — Svizzera 1965–2023',
    description: 'Due modi per esplorare 59 anni di energia svizzera.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
