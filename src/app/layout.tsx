import type { Metadata } from 'next';
import './globals.css';
import './premium.css';
import './brand.css';
import './refinement.css';
import './experience.css';
import './hero-slideshow.css';
import './results-experience.css';
import './voice-experience.css';
import '@fontsource-variable/dm-sans';
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource/dm-serif-display/latin-400-italic.css';
export const metadata: Metadata = {
  title: 'IHAYO · Growing together',
  description:
    'Crop rotation choices, grounded in evidence. A companion for Nigerian farmers and extension agents.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
