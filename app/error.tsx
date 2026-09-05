'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error);
  }, [error]);

  const isChunkError = 
    error?.message?.includes('ChunkLoadError') || 
    error?.message?.includes('Loading chunk');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-900 text-stone-100 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 text-rose-400 text-2xl font-bold">
        !
      </div>
      <h1 className="text-2xl font-semibold mb-2">
        {isChunkError ? 'Application Update in Progress' : 'Something went wrong'}
      </h1>
      <p className="text-stone-400 max-w-md mb-6">
        {isChunkError
          ? 'A new version of application bundles was compiled or loaded. Reloading will sync the latest components.'
          : 'An unexpected error occurred while loading this view. You can try refreshing or resetting the state.'}
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => {
            if (isChunkError) {
              window.location.reload();
            } else {
              reset();
            }
          }}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-medium transition-colors cursor-pointer"
        >
          {isChunkError ? 'Reload Page' : 'Try Again'}
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium transition-colors cursor-pointer"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
