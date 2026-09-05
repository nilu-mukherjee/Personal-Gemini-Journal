import { NextRequest, NextResponse } from 'next/server';

interface NotificationEntry {
  id: string;
  title: string;
  category: string;
  sentiment?: string;
  summary?: string;
  preview?: string;
  locationName?: string;
  coordinates?: { lat: number; lng: number };
}

interface DispatchRequest {
  userId: string;
  channel: 'slack' | 'discord' | 'email';
  entry: NotificationEntry;
  customWebhookUrl?: string;
}

/**
 * Validates a URL to prevent Server-Side Request Forgery (SSRF)
 */
function validateWebhookUrl(urlStr: string, channel: 'slack' | 'discord' | 'email'): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(urlStr);

    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Only HTTPS webhook endpoints are allowed.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Prevent loopback and private subnets
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return { valid: false, reason: 'Private/internal network addresses are strictly prohibited (SSRF defense).' };
    }

    // Specific channel domain verification
    if (channel === 'slack' && !hostname.endsWith('slack.com')) {
      return { valid: false, reason: 'Slack webhooks must originate from a verified slack.com domain.' };
    }

    if (channel === 'discord' && !hostname.endsWith('discord.com') && !hostname.endsWith('discordapp.com')) {
      return { valid: false, reason: 'Discord webhooks must originate from a verified discord.com domain.' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format.' };
  }
}

export async function POST(req: NextRequest) {
  try {
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const body: DispatchRequest = (rawBody && typeof rawBody === 'object') ? rawBody : ({} as any);
    const { userId, channel = 'slack', entry, customWebhookUrl } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID is required for notification authorization.' }, { status: 400 });
    }

    if (!entry || typeof entry !== 'object' || !entry.id) {
      return NextResponse.json({ error: 'Valid entry data is required for notification payload.' }, { status: 400 });
    }

    // Resolve target webhook from environment secrets or user-provided verified custom webhook
    let targetWebhook = customWebhookUrl?.trim();
    if (!targetWebhook) {
      if (channel === 'slack') {
        targetWebhook = process.env.SLACK_WEBHOOK_URL?.trim();
      } else if (channel === 'discord') {
        targetWebhook = process.env.DISCORD_WEBHOOK_URL?.trim();
      }
    }

    const entryTitle = entry.title || 'Untitled Reflection';
    const entryCategory = entry.category || 'General';
    const entrySentiment = entry.sentiment || 'Reflective';
    const entrySnippet = entry.summary || entry.preview || 'New journal reflection processed.';
    const entryLocation = entry.locationName ? `📍 ${entry.locationName}` : 'No location attached';

    // If no webhook URL is configured in secrets or provided, return simulated delivery
    if (!targetWebhook) {
      return NextResponse.json({
        success: true,
        simulated: true,
        channel,
        message: `Notification simulated successfully. To receive live alerts, configure ${
          channel === 'slack' ? 'SLACK_WEBHOOK_URL' : 'DISCORD_WEBHOOK_URL'
        } in .env or provide your personal webhook URL.`,
        payloadPreview: {
          channel,
          title: entryTitle,
          category: entryCategory,
          sentiment: entrySentiment,
          location: entryLocation,
          timestamp: new Date().toISOString()
        }
      });
    }

    // SSRF validation on target webhook
    const validation = validateWebhookUrl(targetWebhook, channel);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Webhook URL rejected: ${validation.reason}` },
        { status: 400 }
      );
    }

    // Construct channel-specific payload
    let dispatchPayload: any;
    if (channel === 'slack') {
      dispatchPayload = {
        text: `📝 *New Reflection*: ${entryTitle}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '✨ Gemini Journal Reflection',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Category:*\n${entryCategory}` },
              { type: 'mrkdwn', text: `*Sentiment:*\n${entrySentiment}` },
              { type: 'mrkdwn', text: `*Location:*\n${entryLocation}` },
              { type: 'mrkdwn', text: `*Timestamp:*\n${new Date().toLocaleTimeString()}` }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Reflection Insight:*\n>${entrySnippet}`
            }
          }
        ]
      };
    } else if (channel === 'discord') {
      dispatchPayload = {
        content: '✨ **New Gemini Journal Reflection Logged**',
        embeds: [
          {
            title: entryTitle,
            description: entrySnippet,
            color: 0x4f46e5,
            fields: [
              { name: 'Category', value: entryCategory, inline: true },
              { name: 'Sentiment', value: entrySentiment, inline: true },
              { name: 'Location', value: entryLocation, inline: true }
            ],
            footer: { text: 'Gemini Journal & Reflections' },
            timestamp: new Date().toISOString()
          }
        ]
      };
    } else {
      // Email simulation
      return NextResponse.json({
        success: true,
        simulated: true,
        channel: 'email',
        message: `Email alert simulated for ${entryTitle}.`,
        timestamp: new Date().toISOString()
      });
    }

    // Safe delivery with AbortController timeout (4s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const resp = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        return NextResponse.json(
          {
            success: false,
            error: `External webhook rejected payload (${resp.status}): ${errText.slice(0, 150)}`
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        simulated: false,
        channel,
        deliveredAt: new Date().toISOString()
      });
    } catch (dispatchErr: any) {
      clearTimeout(timeoutId);
      if (dispatchErr.name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: 'External webhook delivery timed out after 4000ms.' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { success: false, error: dispatchErr.message || 'Webhook dispatch failed.' },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error('Notification dispatch route error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during notification dispatch.' },
      { status: 500 }
    );
  }
}
