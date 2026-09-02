import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Gemini Journal & Reflections',
  description: 'A user-authenticated journaling and reflection app powered by Firebase Authentication, Cloud Firestore, and Gemini 3.6 Flash.',
  openGraph: {
    title: 'Gemini Journal & Reflections',
    description: 'A user-authenticated journaling and reflection app powered by Firebase Authentication, Cloud Firestore, and Gemini 3.6 Flash.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gemini Journal & Reflections',
    description: 'A user-authenticated journaling and reflection app powered by Firebase Authentication, Cloud Firestore, and Gemini 3.6 Flash.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
