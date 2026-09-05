'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, onAuthStateChanged } from '@/lib/firebase';
import { 
  UserInteraction, 
  UserProfile,
  subscribeUserInteractions, 
  removeInteraction,
  syncUserProfile
} from '@/lib/firestore-utils';
import { Navbar } from '@/components/Navbar';
import { AuthView } from '@/components/AuthView';
import { HistorySidebar } from '@/components/HistorySidebar';
import { ReflectionWorkspace } from '@/components/ReflectionWorkspace';
import { AdminDashboard } from '@/components/AdminDashboard';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);
  const [activeInteraction, setActiveInteraction] = useState<UserInteraction | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [currentView, setCurrentView] = useState<'workspace' | 'admin'>('workspace');

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setInteractions([]);
        setActiveInteraction(null);
        setDbConnected(false);
        setUserProfile(null);
        setCurrentView('workspace');
      } else {
        try {
          const profile = await syncUserProfile(
            currentUser.uid,
            currentUser.email,
            currentUser.displayName
          );
          setUserProfile(profile);
        } catch (err) {
          console.warn('User profile sync notice:', err);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = 
    userProfile?.role === 'admin' || 
    user?.email?.toLowerCase() === '07.nilu@gmail.com';

  // Subscribe to Firestore interactions strictly isolated to the user
  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeUserInteractions(
      user.uid,
      (data) => {
        setDbConnected(true);
        setInteractions(data);
        // If no active interaction is selected, pick the first one
        setActiveInteraction((current) => {
          if (!current && data.length > 0) {
            return data[0];
          }
          if (current) {
            // Keep updated state from Firestore
            const updatedMatch = data.find((item) => item.id === current.id);
            return updatedMatch || current;
          }
          return null;
        });
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        setDbConnected(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleCreateNew = () => {
    const newEntry: UserInteraction = {
      id: 'ref-' + Date.now(),
      userId: user?.uid || '',
      title: 'New Reflection',
      category: 'reflection',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setActiveInteraction(newEntry);
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!user) return;
    try {
      await removeInteraction(user.uid, id);
      if (activeInteraction?.id === id) {
        const remaining = interactions.filter((item) => item.id !== id);
        setActiveInteraction(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 text-stone-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-stone-100 shadow-xs mb-4">
          <Sparkles className="h-6 w-6 text-amber-300" />
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-stone-600">
          <RefreshCw className="h-4 w-4 animate-spin text-stone-500" />
          <span>Verifying authentication status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 font-sans text-stone-900 selection:bg-stone-900 selection:text-white">
      <Navbar 
        user={user} 
        dbConnected={dbConnected} 
        isAdmin={isAdmin}
        activeView={currentView}
        onToggleAdminView={() => setCurrentView(currentView === 'admin' ? 'workspace' : 'admin')}
      />

      {!user ? (
        <AuthView onAuthSuccess={() => {}} />
      ) : currentView === 'admin' && isAdmin ? (
        <AdminDashboard 
          currentUser={user} 
          onBackToWorkspace={() => setCurrentView('workspace')} 
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <HistorySidebar
            interactions={interactions}
            activeId={activeInteraction?.id || null}
            onSelect={(item) => setActiveInteraction(item)}
            onNew={handleCreateNew}
            onDelete={handleDeleteInteraction}
            isOpen={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
          />

          <ReflectionWorkspace
            userId={user.uid}
            activeInteraction={activeInteraction}
            onUpdateInteraction={(updated) => setActiveInteraction(updated)}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      )}
    </div>
  );
}
