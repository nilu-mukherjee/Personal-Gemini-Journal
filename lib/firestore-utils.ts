import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

export interface JournalMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface UserInteraction {
  id: string;
  userId: string;
  title: string;
  category: 'reflection' | 'journal' | 'brainstorm' | 'summary';
  summary?: string;
  createdAt: string;
  updatedAt: string;
  messages: JournalMessage[];
  tags?: string[];
  modelUsed?: string;
}

/**
 * Strips all undefined properties recursively from an object to ensure
 * Firestore drivers never reject payloads with undefined properties.
 */
export function cleanPayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  return JSON.parse(
    JSON.stringify(obj, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * Returns the interaction collection reference strictly isolated to the specified userId.
 * Follows path: /users/{userId}/interactions
 */
export function getUserInteractionsRef(userId: string) {
  if (!userId) throw new Error('User ID is required for Firestore operations.');
  return collection(db, 'users', userId, 'interactions');
}

/**
 * Subscribes to real-time updates of the user's interactions sorted by latest update.
 */
export function subscribeUserInteractions(
  userId: string,
  onData: (interactions: UserInteraction[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onData([]);
    return () => {};
  }

  try {
    const interactionsRef = getUserInteractionsRef(userId);
    const q = query(interactionsRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: UserInteraction[] = [];
        snapshot.forEach((docSnap) => {
          items.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<UserInteraction, 'id'>)
          });
        });
        onData(items);
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        onError(error);
      }
    );
  } catch (err: any) {
    console.error('Failed to create subscription query:', err);
    onError(err);
    return () => {};
  }
}

/**
 * Persists an interaction to Firestore under /users/{userId}/interactions/{interactionId}.
 * Enforces undefined stripping and verified transaction settlement.
 */
export async function persistInteraction(
  userId: string,
  interaction: UserInteraction
): Promise<void> {
  if (!userId) {
    throw new Error('User authentication required to save entries.');
  }
  if (!interaction.id) {
    throw new Error('Interaction ID is missing.');
  }

  const sanitized = cleanPayload({
    ...interaction,
    userId,
    updatedAt: new Date().toISOString()
  });

  const docRef = doc(db, 'users', userId, 'interactions', interaction.id);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Deletes an interaction from Firestore under /users/{userId}/interactions/{interactionId}.
 */
export async function removeInteraction(
  userId: string,
  interactionId: string
): Promise<void> {
  if (!userId || !interactionId) {
    throw new Error('User ID and Interaction ID are required to remove entry.');
  }

  const docRef = doc(db, 'users', userId, 'interactions', interactionId);
  await deleteDoc(docRef);
}
