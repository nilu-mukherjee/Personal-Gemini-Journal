'use client';

import React from 'react';
import { User } from 'firebase/auth';
import { Sparkles, ShieldCheck, LogOut, Database, User as UserIcon } from 'lucide-react';
import { logout } from '@/lib/firebase';

interface NavbarProps {
  user: User | null;
  dbConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ user, dbConnected }) => {
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-stone-50/90 px-4 py-3 backdrop-blur-md sm:px-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-stone-100 shadow-xs">
          <Sparkles className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-tight text-stone-900">
              Reflections with Gemini
            </h1>
            <span className="hidden items-center gap-1 rounded-md bg-stone-200/70 px-2 py-0.5 text-xs font-medium text-stone-700 sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Isolated
            </span>
          </div>
          <p className="hidden text-xs text-stone-500 sm:block">
            Gemini 3.6 Flash &bull; Cloud Firestore
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            {/* Database isolation badge */}
            <div
              id="firestore-status-badge"
              className="hidden items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 md:flex"
              title="Documents isolated to request.auth.uid"
            >
              <Database className={`h-3.5 w-3.5 ${dbConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span>{dbConnected ? 'Firestore Active' : 'Connecting'}</span>
            </div>

            {/* User Profile */}
            <div
              id="user-profile-badge"
              className="flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pr-3 pl-1.5 text-xs text-stone-700 shadow-2xs"
            >
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-stone-600">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="max-w-[120px] truncate font-medium sm:max-w-[160px]">
                {user.displayName || user.email || 'Authenticated User'}
              </span>
            </div>

            {/* Logout Button */}
            <button
              id="sign-out-btn"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-900 focus:ring-2 focus:ring-stone-400 focus:outline-hidden"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600">
              Authentication Required
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
