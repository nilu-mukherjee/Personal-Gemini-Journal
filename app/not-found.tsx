import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-900 text-stone-100 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-400 text-2xl font-bold">
        404
      </div>
      <h1 className="text-2xl font-semibold mb-2">Page Not Found</h1>
      <p className="text-stone-400 max-w-md mb-6">
        The reflection or page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-medium transition-colors"
      >
        Return to Reflections
      </Link>
    </div>
  );
}
