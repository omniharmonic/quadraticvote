import type { Metadata } from 'next';
import './globals.css';
import { Fraunces, Newsreader, JetBrains_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminProvider } from '@/contexts/AdminContext';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  axes: ['opsz'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'QuadraticVote.xyz — community decisions, fairly counted',
  description:
    'A drafting table for civic decisions. Allocate credits, count by √, and turn community signal into fair outcomes.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${newsreader.variable} ${mono.variable}`}
    >
      <body className="font-serif antialiased">
        <AuthProvider>
          <AdminProvider>
            {children}
            <Toaster />
          </AdminProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
