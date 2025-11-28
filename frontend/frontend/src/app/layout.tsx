import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Farcaster Gas Checker | Check Gas Spent by Username',
  description: 'Check how much gas any Farcaster user has spent on Ethereum and Base. Enter a username to see their wallet activity and total gas costs.',
  keywords: ['Farcaster', 'Gas', 'Ethereum', 'Base', 'Wallet', 'Web3'],
  openGraph: {
    title: 'Farcaster Gas Checker',
    description: 'Check how much gas any Farcaster user has spent on Ethereum and Base.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Farcaster Gas Checker',
    description: 'Check how much gas any Farcaster user has spent on Ethereum and Base.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        {/* Animated background */}
        <div className="animated-bg" />
        
        {/* Main content */}
        <main className="relative min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
