'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Globe
} from 'lucide-react';
import { loginWithGoogle, loginAsGuestDemo } from '@/lib/firebase';

interface AuthViewProps {
  onAuthSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setUnauthorizedDomain(null);
    try {
      await loginWithGoogle();
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        const host = err?.host || (typeof window !== 'undefined' ? window.location.hostname : 'gemini-journal-1003427733440.asia-southeast1.run.app');
        setUnauthorizedDomain(host);
        setErrorMessage(
          `Domain '${host}' is not on the Firebase Authorized Domains list for project 'fixmycity-506122'.`
        );
      } else {
        setErrorMessage(
          err?.message || 'Unable to complete sign-in. If popups are restricted in this preview, please try the Sandbox Demo button below.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDomain = () => {
    if (!unauthorizedDomain) return;
    navigator.clipboard.writeText(unauthorizedDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGuestDemo = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginAsGuestDemo();
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      console.error('Guest sign-in error:', err);
      setErrorMessage(err?.message || 'Unable to initialize demo session.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-60px)] items-center justify-center bg-stone-100/60 px-4 py-12 sm:px-6">
      <div
        id="auth-landing-card"
        className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900 text-stone-100 shadow-xs">
            <Sparkles className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-900">
              Gemini Journal & Reflections
            </h2>
            <p className="text-sm text-stone-500">
              Private reflective journaling powered by Gemini AI
            </p>
          </div>
        </div>

        {/* Narrative Description */}
        <div className="mt-6 border-t border-stone-100 pt-6">
          <p className="text-sm leading-relaxed text-stone-600">
            Welcome to your private reflection space. Converse with Gemini 3.6 Flash to explore thoughts, synthesize complex days, brainstorm creative breakthroughs, and maintain an authentic record of your personal growth.
          </p>
        </div>

        {/* Security & Architecture Highlights */}
        <div className="mt-6 space-y-3 rounded-xl bg-stone-50 p-4 border border-stone-200/80">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" />
            <div className="text-xs text-stone-600">
              <strong className="font-semibold text-stone-900">User Data Isolation:</strong>{' '}
              Strict Firestore security rules guarantee your entries are owner-bound and isolated exclusively to your account.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" />
            <div className="text-xs text-stone-600">
              <strong className="font-semibold text-stone-900">Federated Authentication:</strong>{' '}
              Sign in securely via Google. Credentials and passwords are never processed or stored on our servers.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" />
            <div className="text-xs text-stone-600">
              <strong className="font-semibold text-stone-900">Cloud Firestore Persistence:</strong>{' '}
              Multi-turn reflections and executive summaries persist permanently in your private collection.
            </div>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div
            id="auth-error-banner"
            className="mt-4 rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-900 shadow-2xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Authentication notice</p>
                <p className="mt-0.5 text-red-800">{errorMessage}</p>
              </div>
            </div>

            {unauthorizedDomain && (
              <div className="mt-3.5 pt-3 border-t border-red-200/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-white/90 px-3 py-2 border border-red-200">
                  <div className="flex items-center gap-2 truncate text-stone-800 font-mono text-[11px]">
                    <Globe className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                    <span className="truncate">{unauthorizedDomain}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDomain}
                    className="inline-flex items-center gap-1 shrink-0 rounded-md bg-stone-100 hover:bg-stone-200 px-2 py-1 text-[11px] font-medium text-stone-700 transition"
                    title="Copy domain to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-stone-600" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-stone-700 space-y-1">
                  <p className="font-semibold text-stone-900">How to whitelist this Cloud Run domain:</p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1 text-stone-600">
                    <li>Open <strong>Firebase Console &rarr; Authentication &rarr; Settings</strong>.</li>
                    <li>Scroll down to the <strong>Authorized domains</strong> section.</li>
                    <li>Click <strong>Add domain</strong>, paste the domain above, and click <strong>Done</strong>.</li>
                  </ol>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href="https://console.firebase.google.com/project/fixmycity-506122/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-[11px] font-semibold text-white shadow-2xs transition"
                  >
                    <span>Open Firebase Auth Settings</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <button
                    type="button"
                    onClick={handleGuestDemo}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white hover:bg-red-50/50 px-2.5 py-1.5 text-[11px] font-medium text-red-900 transition"
                  >
                    <span>Continue in Sandbox Demo Mode</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-8 space-y-3">
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-stone-800 focus:ring-2 focus:ring-stone-400 focus:outline-hidden disabled:opacity-60"
          >
            {/* Google Vector Icon */}
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>{isLoading ? 'Signing In...' : 'Sign In with Google'}</span>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </button>

          {/* Sandbox Demo Option */}
          <button
            id="sandbox-demo-btn"
            onClick={handleGuestDemo}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus:ring-2 focus:ring-stone-300 focus:outline-hidden disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-stone-500" />
            <span>Sandbox Demo Access (Zero Popup)</span>
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-stone-400">
          Powered by Gemini 3.6 Flash API &bull; Google Cloud Run
        </div>
      </div>
    </div>
  );
};
