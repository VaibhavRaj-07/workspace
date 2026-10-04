import type { Metadata } from 'next';
import { Archivo_Black, Space_Grotesk, Space_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/common/Providers';
import { GlobalHeader } from '@/components/common/GlobalHeader';
import { GlobalFooter } from '@/components/common/GlobalFooter';

const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-archivo-black',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Collaborative Project Workspace // NEO-BRUTALIST',
  description:
    'Real-time collaborative project workspace with optimistic concurrency control, AI-assisted merge resolution, and deadline risk analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivoBlack.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (stored === 'dark' || (!stored && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-paper text-ink font-body antialiased selection:bg-hot-pink selection:text-ink flex flex-col">
        <Providers>
          <GlobalHeader />
          <div className="flex-1 min-h-[calc(100vh-140px)]">{children}</div>
          <GlobalFooter />
        </Providers>
      </body>
    </html>
  );
}
