import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Contributor History — GitHub contributor growth chart',
  description:
    'The missing GitHub contributor history graph. Compare contributor growth across open source projects over time.',
  openGraph: {
    title: 'Contributor History',
    description: 'Compare contributor growth across GitHub projects',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
