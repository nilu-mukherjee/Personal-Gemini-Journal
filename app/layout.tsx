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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                window.addEventListener('error', function(e) {
                  var msg = (e && (e.message || (e.error && e.error.message))) || '';
                  if (typeof msg === 'string' && (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Loading chunk') !== -1)) {
                    var key = '__chunk_err_recovery';
                    var last = sessionStorage.getItem(key);
                    var now = Date.now();
                    if (!last || now - parseInt(last, 10) > 8000) {
                      sessionStorage.setItem(key, now.toString());
                      console.warn('ChunkLoadError detected: recovering by reloading latest bundles...');
                      window.location.reload();
                    }
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
