import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Morning Radar',
  description: 'A private local-first personal intelligence dashboard.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
