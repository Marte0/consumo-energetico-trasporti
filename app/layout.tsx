import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://energy-atlas-switzerland.royal-hare-6289.chatgpt.site'),
  title: 'Energia in movimento — Trasporti 2000–2025',
  description:
    'Due infografiche interattive sul consumo energetico dei trasporti secondo il vettore energetico.',
  openGraph: {
    title: 'Energia in movimento — Trasporti 2000–2025',
    description: 'Due modi per esplorare 26 anni di consumi energetici nei trasporti.',
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
