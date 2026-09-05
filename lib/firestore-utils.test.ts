import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    setDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
  };
});

import { setDoc, deleteDoc } from 'firebase/firestore';
import {
  cleanPayload,
  getUserInteractionsRef,
  persistInteraction,
  removeInteraction,
  type UserInteraction,
} from './firestore-utils';

const mockedSetDoc = setDoc as unknown as Mock;
const mockedDeleteDoc = deleteDoc as unknown as Mock;

const baseInteraction: UserInteraction = {
  id: 'int-1',
  userId: 'user-1',
  title: 'Untitled',
  category: 'journal',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  messages: [],
};

describe('cleanPayload', () => {
  it('converts undefined properties to null', () => {
    const input = { a: 1, b: undefined, c: 'keep' };
    expect(cleanPayload(input)).toEqual({ a: 1, b: null, c: 'keep' });
  });

  it('passes through top-level null and undefined unchanged', () => {
    expect(cleanPayload(null)).toBeNull();
    expect(cleanPayload(undefined)).toBeUndefined();
  });

  it('leaves defined nested values intact', () => {
    const input = { nested: { x: 1, arr: [1, 'two', { y: 3 }] }, tags: ['a', 'b'] };
    expect(cleanPayload(input)).toEqual(input);
  });
});

describe('getUserInteractionsRef', () => {
  it('throws when userId is empty', () => {
    expect(() => getUserInteractionsRef('')).toThrow('User ID is required for Firestore operations.');
  });
});

describe('persistInteraction guards', () => {
  it('throws when userId is missing', async () => {
    await expect(persistInteraction('', baseInteraction)).rejects.toThrow(
      'User authentication required to save entries.'
    );
  });

  it('throws when interaction.id is missing', async () => {
    const { id, ...rest } = baseInteraction;
    await expect(
      persistInteraction('user-1', { ...rest, id: '' } as UserInteraction)
    ).rejects.toThrow('Interaction ID is missing.');
  });
});

describe('persistInteraction', () => {
  it('writes a sanitized payload with merge:true at users/{userId}/interactions/{id}', async () => {
    mockedSetDoc.mockClear();

    await persistInteraction('user-1', { ...baseInteraction, summary: undefined });

    expect(mockedSetDoc).toHaveBeenCalledTimes(1);
    const [docRef, payload, options] = mockedSetDoc.mock.calls[0];
    expect(docRef.path).toBe('users/user-1/interactions/int-1');
    expect(payload).toMatchObject({ id: 'int-1', userId: 'user-1', summary: null });
    expect(typeof payload.updatedAt).toBe('string');
    expect(options).toEqual({ merge: true });
  });
});

describe('removeInteraction', () => {
  it('throws when userId or interactionId is missing', async () => {
    await expect(removeInteraction('', 'int-1')).rejects.toThrow(
      'User ID and Interaction ID are required to remove entry.'
    );
    await expect(removeInteraction('user-1', '')).rejects.toThrow(
      'User ID and Interaction ID are required to remove entry.'
    );
  });

  it('deletes the doc at users/{userId}/interactions/{interactionId}', async () => {
    mockedDeleteDoc.mockClear();

    await removeInteraction('user-1', 'int-1');

    expect(mockedDeleteDoc).toHaveBeenCalledTimes(1);
    const [docRef] = mockedDeleteDoc.mock.calls[0];
    expect(docRef.path).toBe('users/user-1/interactions/int-1');
  });
});
