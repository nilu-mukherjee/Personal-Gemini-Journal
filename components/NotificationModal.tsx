'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { UserInteraction } from '@/lib/firestore-utils';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  activeInteraction: UserInteraction | null;
  onNotificationSent?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  userId,
  activeInteraction,
  onNotificationSent
}) => {
  const [channel, setChannel] = useState<'slack' | 'discord' | 'email'>('slack');
  const [customWebhookUrl, setCustomWebhookUrl] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: any;
  } | null>(null);

  if (!isOpen) return null;

  const handleSendNotification = async (isTest: boolean = false) => {
    setIsDispatching(true);
    setResultMessage(null);

    const endpoint = isTest ? '/api/notifications/test' : '/api/notifications/dispatch';
    const payload = isTest
      ? {
          channel,
          webhookUrl: customWebhookUrl.trim() || undefined,
        }
      : {
          userId,
          channel,
          customWebhookUrl: customWebhookUrl.trim() || undefined,
          entry: {
            id: activeInteraction?.id || 'entry-' + Date.now(),
            title: activeInteraction?.title || 'Daily Reflection',
            category: activeInteraction?.category || 'reflection',
            sentiment: activeInteraction?.sentiment || 'Reflective',
            summary: activeInteraction?.summary || activeInteraction?.messages?.[0]?.content?.slice(0, 200) || 'Reflection logged',
            locationName: activeInteraction?.location?.name,
            coordinates: activeInteraction?.location ? { lat: activeInteraction.location.lat, lng: activeInteraction.location.lng } : undefined,
          },
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      if (data.simulated) {
        setResultMessage({
          type: 'success',
          text: `Simulated Dispatch: ${data.message || 'Notification verified in simulation mode.'}`,
          details: data.payloadPreview,
        });
      } else {
        setResultMessage({
          type: 'success',
          text: `Live Dispatch Succeeded! Dispatched alert to ${channel.toUpperCase()} at ${new Date(data.deliveredAt || Date.now()).toLocaleTimeString()}.`,
        });
      }

      if (!isTest && onNotificationSent) {
        onNotificationSent();
      }
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        text: err.message || 'Failed to dispatch notification.',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-xs">
      <div 
        id="notification-dispatch-modal"
        className="relative w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900">External Notifications</h3>
              <p className="text-xs text-stone-500">Dispatch reflection alerts to Slack, Discord, or Email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Channel Selector */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-700">Notification Channel</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['slack', 'discord', 'email'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannel(ch)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs font-medium capitalize transition ${
                    channel === ch
                      ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span>{ch}</span>
                  <span className={`text-[10px] ${channel === ch ? 'text-stone-300' : 'text-stone-400'}`}>
                    {ch === 'slack' ? 'Slack Webhook' : ch === 'discord' ? 'Discord Webhook' : 'Digest simulation'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Webhook Configuration */}
          {channel !== 'email' && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700">
                  Custom Webhook URL <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <span className="text-[10px] text-stone-400 font-mono">
                  Default: Server .env
                </span>
              </div>
              <input
                type="url"
                value={customWebhookUrl}
                onChange={(e) => setCustomWebhookUrl(e.target.value)}
                placeholder={
                  channel === 'slack'
                    ? 'https://hooks.slack.com/services/...'
                    : 'https://discord.com/api/webhooks/...'
                }
                className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-hidden"
              />
              <p className="mt-1 text-[11px] text-stone-500">
                Protected with SSRF validation. If left blank, the server will use environment secrets or run safe simulation.
              </p>
            </div>
          )}

          {/* Active Entry Preview */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs">
            <div className="flex items-center justify-between text-stone-600 font-medium">
              <span>Attached Entry:</span>
              <span className="text-[11px] font-mono text-stone-400">{activeInteraction?.category || 'reflection'}</span>
            </div>
            <p className="mt-1 font-semibold text-stone-900 line-clamp-1">
              {activeInteraction?.title || 'New Reflection'}
            </p>
            {activeInteraction?.location && (
              <p className="mt-0.5 text-[11px] text-emerald-700">
                📍 {activeInteraction.location.name}
              </p>
            )}
          </div>

          {/* Result Banner */}
          {resultMessage && (
            <div
              className={`rounded-xl border p-3 text-xs ${
                resultMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {resultMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{resultMessage.text}</p>
                  {resultMessage.details && (
                    <pre className="mt-2 max-h-24 overflow-y-auto rounded-md bg-white/80 p-2 text-[10px] font-mono text-stone-700">
                      {JSON.stringify(resultMessage.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Guarantee */}
          <div className="flex items-center gap-2 text-[11px] text-stone-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Server-side webhook proxying protects API credentials and prevents token leakage.</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleSendNotification(true)}
              disabled={isDispatching}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition shadow-2xs"
            >
              Send Test Webhook
            </button>
            <button
              type="button"
              onClick={() => handleSendNotification(false)}
              disabled={isDispatching}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
            >
              {isDispatching ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Dispatch Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
