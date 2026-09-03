import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UWU Tracker | Lux Obscura - Final Fantasy XIV',
  description:
    'Seguimiento de progreso en The Weapon’s Refrain (Ultimate), horarios semanales y buscador de party para la Free Company Lux Obscura.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} ${plusJakarta.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#060814] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
