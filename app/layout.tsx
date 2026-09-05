import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Gemini Journal & Reflections',
  description: 'A user-authenticated journaling and reflection app powered by Firebase Authentication, Cloud Firestore, Gemini 3.6 Flash, Google Maps location pinning, and admin RBAC.',
  openGraph: {
    title: 'Gemini Journal & Reflections',
    description: 'A user-authenticated journaling and reflection app powered by Firebase Authentication, Cloud Firestore, Gemini 3.6 Flash, Google Maps location pinning, and admin RBAC.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gemini Journal & Reflections',
    description: 'A user-authenticated journaling and reflection app powered by Firebase Authentication, Cloud Firestore, Gemini 3.6 Flash, Google Maps location pinning, and admin RBAC.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
