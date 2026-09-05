import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function GoogleGenAI(this: any) {
    this.models = { generateContent: mockGenerateContent };
  }),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';

function makeRequest(rawBody: string) {
  return new NextRequest('http://localhost/api/gemini/reflect', {
    method: 'POST',
    body: rawBody,
  });
}

function makeJsonRequest(body: unknown) {
  return makeRequest(JSON.stringify(body));
}

beforeEach(() => {
  mockGenerateContent.mockReset();
  process.env.GEMINI_API_KEY = 'test-key';
});

describe('POST /api/gemini/reflect — input validation', () => {
  it('returns 400 for invalid JSON payload', async () => {
    const res = await POST(makeRequest('{not valid json'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON payload format.');
  });

  it('returns 400 when prompt is missing', async () => {
    const res = await POST(makeJsonRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('A non-empty prompt or reflection text is required.');
  });

  it('returns 400 when prompt is only whitespace', async () => {
    const res = await POST(makeJsonRequest({ prompt: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when prompt exceeds 12000 characters', async () => {
    const res = await POST(makeJsonRequest({ prompt: 'a'.repeat(12001) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Prompt length exceeds maximum allowed limit (12,000 characters).');
  });

  it('returns 500 when GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY;

    const res = await POST(makeJsonRequest({ prompt: 'hello' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/GEMINI_API_KEY is not configured/);
  });
});

describe('POST /api/gemini/reflect — mode-specific guidance', () => {
  beforeEach(() => {
    mockGenerateContent.mockResolvedValue({ text: 'a helpful reply' });
  });

  it.each([
    ['reflection', /supportive, thoughtful, and insightful reflective partner/],
    [undefined, /supportive, thoughtful, and insightful reflective partner/],
    ['summary', /clear, empathetic, structured summary/],
    ['brainstorm', /4-6 creative perspectives/],
  ] as const)('mode=%s selects the matching task guidance', async (mode, expected) => {
    await POST(makeJsonRequest({ prompt: 'hello', mode }));

    const [[call]] = mockGenerateContent.mock.calls;
    expect(call.config.systemInstruction).toMatch(expected);
  });
});

describe('POST /api/gemini/reflect — model fallback ladder', () => {
  it('returns the first model in the ladder when it succeeds', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'a helpful reply' });

    const res = await POST(makeJsonRequest({ prompt: 'hello' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toBe('a helpful reply');
    expect(body.modelUsed).toBe('gemini-3.6-flash');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('falls through to the next model when the first fails with a recoverable error', async () => {
    mockGenerateContent
      .mockRejectedValueOnce({ status: 503, message: 'UNAVAILABLE' })
      .mockResolvedValueOnce({ text: 'reply from second model' });

    const res = await POST(makeJsonRequest({ prompt: 'hello' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reply).toBe('reply from second model');
    expect(body.modelUsed).toBe('gemini-3.1-flash-lite');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('returns 500 with the last error after every model fails with a recoverable error', async () => {
    mockGenerateContent.mockRejectedValue({ status: 503, message: 'UNAVAILABLE' });

    const res = await POST(makeJsonRequest({ prompt: 'hello' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('UNAVAILABLE');
    expect(mockGenerateContent).toHaveBeenCalledTimes(4);
  });

  it('fails fast without trying the remaining models when the error is not recoverable', async () => {
    mockGenerateContent.mockRejectedValue(new Error('boom'));

    const res = await POST(makeJsonRequest({ prompt: 'hello' }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('boom');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/gemini/reflect — conversation construction', () => {
  beforeEach(() => {
    mockGenerateContent.mockResolvedValue({ text: 'a helpful reply' });
  });

  it('translates history turns into Gemini contents, defaulting unknown roles to model', async () => {
    await POST(
      makeJsonRequest({
        prompt: 'follow up',
        history: [
          { role: 'user', content: 'hi' },
          { role: 'model', content: 'hello back' },
          { role: 'system', content: 'weird role' },
        ],
      })
    );

    const [[call]] = mockGenerateContent.mock.calls;
    expect(call.contents.slice(0, 3)).toEqual([
      { role: 'user', parts: [{ text: 'hi' }] },
      { role: 'model', parts: [{ text: 'hello back' }] },
      { role: 'model', parts: [{ text: 'weird role' }] },
    ]);
  });

  it('trims and wraps the current prompt in <user_journal_content> tags', async () => {
    await POST(makeJsonRequest({ prompt: '  hello world  ' }));

    const [[call]] = mockGenerateContent.mock.calls;
    const lastTurn = call.contents[call.contents.length - 1];
    expect(lastTurn).toEqual({
      role: 'user',
      parts: [{ text: '<user_journal_content>\nhello world\n</user_journal_content>' }],
    });
  });
});
