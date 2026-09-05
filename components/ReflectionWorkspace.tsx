'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Check, 
  Copy, 
  AlertTriangle, 
  RefreshCw, 
  User as UserIcon, 
  Menu, 
  Compass, 
  FileText, 
  Lightbulb, 
  BookmarkCheck,
  MapPin,
  Bell,
  Navigation
} from 'lucide-react';
import { UserInteraction, JournalMessage, persistInteraction, LocationData } from '@/lib/firestore-utils';
import { GoogleMapPicker } from './GoogleMapPicker';
import { NotificationModal } from './NotificationModal';

interface ReflectionWorkspaceProps {
  userId: string;
  activeInteraction: UserInteraction | null;
  onUpdateInteraction: (updated: UserInteraction) => void;
  onToggleSidebar: () => void;
}

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  userId,
  activeInteraction,
  onUpdateInteraction,
  onToggleSidebar,
}) => {
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'reflection' | 'summary' | 'brainstorm'>('reflection');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derive mode cleanly without unnecessary effect-driven setState
  const mode = (
    activeInteraction?.category && ['reflection', 'summary', 'brainstorm'].includes(activeInteraction.category)
      ? activeInteraction.category
      : selectedMode
  ) as 'reflection' | 'summary' | 'brainstorm';

  const handleSelectMode = (newMode: 'reflection' | 'summary' | 'brainstorm') => {
    setSelectedMode(newMode);
    if (activeInteraction) {
      const updated: UserInteraction = {
        ...activeInteraction,
        category: newMode,
        updatedAt: new Date().toISOString(),
      };
      onUpdateInteraction(updated);
      persistInteraction(userId, updated).catch((err) =>
        console.warn('Failed to persist mode category change:', err)
      );
    }
  };

  const handleLocationChange = async (newLocation: LocationData | null) => {
    if (!activeInteraction) return;
    const updated: UserInteraction = {
      ...activeInteraction,
      location: newLocation,
      updatedAt: new Date().toISOString(),
    };
    onUpdateInteraction(updated);
    try {
      await persistInteraction(userId, updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to persist location update:', err);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeInteraction?.messages?.length, isGenerating]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  const handleSendMessage = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setSaveStatus('saving');

    const userMessage: JournalMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    // Prepare current history for server-side reflection route
    const currentMessages = activeInteraction?.messages || [];
    const historyPayload = currentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      // 1. Call Gemini reflection API route with fallback ladder
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: historyPayload,
          mode,
          title: activeInteraction?.title,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error (${response.status})`);
      }

      const data = await response.json();
      const modelReply = data.reply || 'No response generated.';
      const modelUsed = data.modelUsed || 'gemini-3.6-flash';

      const aiMessage: JournalMessage = {
        id: 'msg-ai-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        role: 'model',
        content: modelReply,
        timestamp: new Date().toISOString(),
      };

      // Auto-title from first user prompt if still default
      let updatedTitle = activeInteraction?.title || '';
      if (!updatedTitle || updatedTitle === 'New Reflection' || updatedTitle === 'Untitled Entry') {
        updatedTitle = textToSend.slice(0, 45).replace(/[\r\n]+/g, ' ');
        if (textToSend.length > 45) updatedTitle += '...';
      }

      const updatedMessages = [...currentMessages, userMessage, aiMessage];

      // Auto-extract or update summary
      let summary = activeInteraction?.summary;
      if (mode === 'summary' || !summary) {
        summary = modelReply.slice(0, 160).replace(/[\r\n]+/g, ' ') + '...';
      }

      const updatedInteraction: UserInteraction = {
        id: activeInteraction?.id || 'ref-' + Date.now(),
        userId,
        title: updatedTitle,
        category: mode,
        summary,
        location: activeInteraction?.location || null,
        sentiment: activeInteraction?.sentiment || 'Reflective',
        createdAt: activeInteraction?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: updatedMessages,
        modelUsed,
      };

      // 2. Guaranteed Transaction Verification: Persist strictly to Firestore
      await persistInteraction(userId, updatedInteraction);

      // 3. Only clear input buffer AFTER verified Firestore persistence
      setInputText('');
      setSaveStatus('saved');
      onUpdateInteraction(updatedInteraction);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      console.error('Reflection submission failed:', err);
      setSaveStatus('error');
      setErrorMessage(
        err?.message || 'Failed to complete reflection or save to Firestore. Your text has been preserved.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyConversation = async () => {
    if (!activeInteraction) return;
    const text = activeInteraction.messages
      .map((m) => `${m.role === 'user' ? 'USER' : 'GEMINI'}:\n${m.content}\n`)
      .join('\n---\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard error:', err);
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    if (!activeInteraction) return;
    const updated: UserInteraction = {
      ...activeInteraction,
      title: newTitle,
      updatedAt: new Date().toISOString(),
    };
    try {
      await persistInteraction(userId, updated);
      onUpdateInteraction(updated);
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  const starterPrompts = [
    'What was a meaningful highlight or quiet victory from today?',
    'I have a difficult decision to make regarding...',
    'Synthesize my thoughts on how to balance productivity and wellness.',
    'Brainstorm creative angles for a project I am working on...',
  ];

  return (
    <main
      id="reflection-workspace"
      className="flex flex-1 flex-col h-[calc(100vh-60px)] bg-white overflow-hidden"
    >
      {/* Top Workspace Header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            id="toggle-sidebar-btn"
            onClick={onToggleSidebar}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 lg:hidden"
            title="Toggle past entries"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <input
              id="reflection-title-input"
              type="text"
              value={activeInteraction?.title || 'New Reflection'}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="border-b border-transparent bg-transparent text-sm sm:text-base font-semibold text-stone-900 focus:border-stone-400 focus:outline-hidden"
              placeholder="Title your reflection..."
            />
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span>
                {activeInteraction?.messages?.length || 0} exchange
                {(activeInteraction?.messages?.length || 0) === 1 ? '' : 's'}
              </span>
              {activeInteraction?.modelUsed && (
                <>
                  <span>&bull;</span>
                  <span className="font-mono text-[10px] text-stone-500">
                    {activeInteraction.modelUsed}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Firestore save indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-600 font-medium animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <BookmarkCheck className="h-3.5 w-3.5" />
                Saved to Firestore
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Sync Issue
              </span>
            )}
          </div>

          {/* Pin Location Trigger */}
          <button
            id="toggle-map-picker-btn"
            onClick={() => setShowMapPicker(!showMapPicker)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              showMapPicker || activeInteraction?.location
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
            }`}
            title="Pin location to reflection"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline max-w-[120px] truncate">
              {activeInteraction?.location ? activeInteraction.location.name : 'Pin Location'}
            </span>
          </button>

          {/* External Notification Trigger */}
          <button
            id="toggle-notification-modal-btn"
            onClick={() => setShowNotificationModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50 transition"
            title="Dispatch notification to Slack/Discord"
          >
            <Bell className="h-3.5 w-3.5 text-amber-600" />
            <span className="hidden sm:inline">Alert</span>
          </button>

          {/* Copy full reflection */}
          {activeInteraction && activeInteraction.messages.length > 0 && (
            <button
              id="copy-entry-btn"
              onClick={handleCopyConversation}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50 transition"
              title="Copy conversation"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Bar */}
      <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/60 px-4 py-2 text-xs text-stone-600 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-medium text-stone-400">Gemini Lens:</span>
          <button
            id="mode-reflection-btn"
            onClick={() => handleSelectMode('reflection')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
              mode === 'reflection'
                ? 'bg-stone-900 font-medium text-white shadow-2xs'
                : 'hover:bg-stone-200/70 text-stone-600'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Deep Reflection</span>
          </button>
          <button
            id="mode-summary-btn"
            onClick={() => handleSelectMode('summary')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
              mode === 'summary'
                ? 'bg-stone-900 font-medium text-white shadow-2xs'
                : 'hover:bg-stone-200/70 text-stone-600'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Key Summary</span>
          </button>
          <button
            id="mode-brainstorm-btn"
            onClick={() => handleSelectMode('brainstorm')}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
              mode === 'brainstorm'
                ? 'bg-stone-900 font-medium text-white shadow-2xs'
                : 'hover:bg-stone-200/70 text-stone-600'
            }`}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            <span>Brainstorm</span>
          </button>
        </div>

        {activeInteraction?.location && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <MapPin className="h-3 w-3 text-emerald-600" />
            <span className="font-medium">{activeInteraction.location.name}</span>
          </div>
        )}
      </div>

      {/* Collapsible Google Maps Picker Drawer */}
      {showMapPicker && (
        <div className="border-b border-stone-200 bg-stone-100/60 p-4 sm:px-6">
          <GoogleMapPicker
            location={activeInteraction?.location || null}
            onSelectLocation={(loc) => {
              handleLocationChange(loc);
            }}
          />
        </div>
      )}

      {/* Messages Stream */}
      <div
        id="messages-stream"
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6"
      >
        {!activeInteraction || activeInteraction.messages.length === 0 ? (
          <div className="mx-auto max-w-xl py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
              <Sparkles className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-stone-900">
              Begin your reflection
            </h3>
            <p className="mt-1 text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              Write freely about your day, challenges, ideas, or questions. Gemini 3.6 Flash will assist with empathetic inquiry, synthesis, and creative perspectives.
            </p>

            {/* Quick Starters */}
            <div className="mt-6 text-left space-y-2">
              <p className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                Jumpstart Ideas
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {starterPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setInputText(prompt)}
                    className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-left text-xs text-stone-700 hover:border-stone-300 hover:bg-white transition"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          activeInteraction.messages.map((msg) => {
            const isUser = msg.role === 'user';
            const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                id={`message-bubble-${msg.id}`}
                className={`flex gap-3 sm:gap-4 max-w-3xl ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar icon */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-2xs ${
                    isUser
                      ? 'bg-stone-900 text-white'
                      : 'bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  {isUser ? <UserIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-amber-600" />}
                </div>

                {/* Content Bubble */}
                <div
                  className={`flex-1 rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-stone-900 text-stone-100 rounded-tr-xs'
                      : 'bg-stone-50 text-stone-900 border border-stone-200/80 rounded-tl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-200/20 text-[11px] opacity-70">
                    <span className="font-medium">{isUser ? 'Your Thought' : 'Gemini 3.6 Flash'}</span>
                    <span>{formattedTime}</span>
                  </div>

                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm selection:bg-amber-200 selection:text-stone-900">
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Loading Spinner for Generation */}
        {isGenerating && (
          <div className="flex gap-3 sm:gap-4 max-w-3xl mr-auto">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-200">
              <Sparkles className="h-4 w-4 text-amber-600 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-xs bg-stone-50 border border-stone-200/80 p-4 text-xs text-stone-600 flex items-center gap-2.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-stone-500" />
              <span>Gemini is synthesizing thoughts and reflecting...</span>
            </div>
          </div>
        )}

        {/* Error Notification with Retry */}
        {errorMessage && (
          <div
            id="workspace-error-banner"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <strong className="font-semibold">Generation &amp; Persistence Alert:</strong>
                <p className="mt-0.5">{errorMessage}</p>
                <p className="mt-1 text-[11px] text-red-600">
                  Your written text remains safe in the editor below. You can retry anytime.
                </p>
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 transition"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer (Sticky Bottom) */}
      <div
        id="input-composer"
        className="border-t border-stone-200 bg-stone-50/70 p-3 sm:p-4"
      >
        <div className="mx-auto max-w-4xl">
          <div className="relative rounded-2xl border border-stone-300 bg-white p-2 shadow-xs focus-within:border-stone-900 focus-within:ring-1 focus-within:ring-stone-900">
            <textarea
              id="reflection-textarea"
              ref={textareaRef}
              rows={2}
              placeholder={`Write your reflection (${mode} mode active)... Press Cmd/Ctrl + Enter to send`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              maxLength={12000}
              className="w-full resize-none border-0 bg-transparent p-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden"
            />

            <div className="flex items-center justify-between border-t border-stone-100 pt-2 px-1">
              <div className="flex items-center gap-2 text-[11px] text-stone-400">
                <span>{inputText.length}/12,000</span>
                <span className="hidden sm:inline">&bull;</span>
                <span className="hidden sm:inline">Cmd/Ctrl + Enter</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="send-reflection-btn"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isGenerating}
                  className="flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 disabled:opacity-40 focus:ring-2 focus:ring-stone-400 focus:outline-hidden"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Reflecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        userId={userId}
        activeInteraction={activeInteraction}
      />
    </main>
  );
};
