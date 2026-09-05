import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const { channel = 'slack', webhookUrl } = rawBody || {};

    const testEntry = {
      id: 'test-' + Date.now(),
      title: '🌟 Test Reflection Notification',
      category: 'Test & Verification',
      sentiment: 'Optimistic',
      summary: 'This is a test notification from Gemini Journal & Reflections confirming external integration is operational.',
      locationName: 'San Francisco, CA',
      coordinates: { lat: 37.7749, lng: -122.4194 }
    };

    // Forward to dispatch route
    const dispatchUrl = new URL('/api/notifications/dispatch', req.url).toString();
    const resp = await fetch(dispatchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user',
        channel,
        entry: testEntry,
        customWebhookUrl: webhookUrl
      })
    });

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to run notification test.' }, { status: 500 });
  }
}
