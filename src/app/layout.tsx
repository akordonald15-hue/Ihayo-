import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'IHAYO · Growing together',
  description:
    'Crop rotation choices, grounded in evidence. A companion for Nigerian farmers and extension agents.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
