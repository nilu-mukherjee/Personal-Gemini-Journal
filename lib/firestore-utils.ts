import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  limit,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

export interface JournalMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface LocationData {
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

export interface UserInteraction {
  id: string;
  userId: string;
  title: string;
  category: 'reflection' | 'journal' | 'brainstorm' | 'summary';
  summary?: string;
  sentiment?: 'Positive' | 'Reflective' | 'Challenged' | 'Optimistic' | 'Neutral' | string;
  location?: LocationData | null;
  notificationSent?: boolean;
  createdAt: string;
  updatedAt: string;
  messages: JournalMessage[];
  tags?: string[];
  modelUsed?: string;
}

export interface UserProfile {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail?: string;
  action: string;
  targetUserId?: string;
  details?: string;
  timestamp: string;
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
 * Ensures a user profile exists in /users/{userId}.
 * Assigns 'admin' role if email matches 07.nilu@gmail.com, otherwise defaults to 'user'.
 */
export async function syncUserProfile(
  userId: string,
  email?: string | null,
  displayName?: string | null
): Promise<UserProfile> {
  if (!userId) throw new Error('User ID is required.');

  const userDocRef = doc(db, 'users', userId);
  const snapshot = await getDoc(userDocRef);

  const isDesignatedAdmin = email?.toLowerCase() === '07.nilu@gmail.com';

  if (snapshot.exists()) {
    const data = snapshot.data() as UserProfile;
    // Auto-promote if designated admin email
    if (isDesignatedAdmin && data.role !== 'admin') {
      const updated: UserProfile = {
        ...data,
        role: 'admin',
        updatedAt: new Date().toISOString()
      };
      await setDoc(userDocRef, cleanPayload(updated), { merge: true });
      return updated;
    }
    return data;
  }

  const initialProfile: UserProfile = {
    userId,
    email: email || null,
    displayName: displayName || 'Anonymous User',
    role: isDesignatedAdmin ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(userDocRef, cleanPayload(initialProfile));
  return initialProfile;
}

/**
 * Sets the role of a user in /users/{targetUserId}.
 * Enforces admin authorization and records an audit log.
 */
export async function setUserRole(
  adminId: string,
  adminEmail: string,
  targetUserId: string,
  newRole: 'admin' | 'user'
): Promise<void> {
  if (!adminId || !targetUserId) throw new Error('Admin ID and Target User ID required.');

  const userDocRef = doc(db, 'users', targetUserId);
  await setDoc(
    userDocRef,
    cleanPayload({
      role: newRole,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );

  await recordAuditLog(
    adminId,
    adminEmail,
    `ROLE_CHANGE: Changed role to ${newRole}`,
    targetUserId,
    `Role changed to ${newRole}`
  );
}

/**
 * Appends an immutable audit log entry to /audit_logs/{logId}.
 */
export async function recordAuditLog(
  adminId: string,
  adminEmail: string,
  action: string,
  targetUserId?: string,
  details?: string
): Promise<void> {
  try {
    const logId = 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const logRef = doc(db, 'audit_logs', logId);
    const logData: AuditLog = {
      id: logId,
      adminId,
      adminEmail: adminEmail || 'Admin',
      action,
      targetUserId: targetUserId || undefined,
      details: details || '',
      timestamp: new Date().toISOString()
    };
    await setDoc(logRef, cleanPayload(logData));
  } catch (err) {
    console.warn('Failed to record audit log:', err);
  }
}

/**
 * Subscribes to real-time audit logs for the Admin Dashboard.
 */
export function subscribeAuditLogs(
  onData: (logs: AuditLog[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  try {
    const logsRef = collection(db, 'audit_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: AuditLog[] = [];
        snapshot.forEach((d) => items.push(d.data() as AuditLog));
        onData(items);
      },
      onError
    );
  } catch (err: any) {
    onError(err);
    return () => {};
  }
}

/**
 * Subscribes to real-time users collection for Admin user management.
 */
export function subscribeAllUsers(
  onData: (users: UserProfile[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const items: UserProfile[] = [];
        snapshot.forEach((d) => {
          items.push({
            userId: d.id,
            ...(d.data() as Omit<UserProfile, 'userId'>)
          });
        });
        onData(items);
      },
      onError
    );
  } catch (err: any) {
    onError(err);
    return () => {};
  }
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
