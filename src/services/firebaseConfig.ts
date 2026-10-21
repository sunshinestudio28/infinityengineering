import { StockEntry, FirebaseConfigInfo } from '../types/inventory';
import { parseFirestoreDocument, formatFirestoreDocument } from '../utils/stockCalculations';

export const FIREBASE_CONSTANTS = {
  PROJECT_ID: 'infinity-engineering-stock',
  COLLECTION_NAME: 'stockEntries',
  API_KEY: 'AIzaSyBnYjXqvLgq4cUupZXeaikb_fkE2Ca3UKE',
  ADMIN_EMAIL: 'itsrazz25@gmail.com',
  DEFAULT_USER_EMAIL: 'warehouse@infinityengineering.local',
  AUTH_STORAGE_KEY: 'infinity-engineering-auth-v2',
  STOCK_CACHE_KEY: 'infinity-engineering-stock-cache-v1',
  LAST_SYNC_KEY: 'infinity-engineering-stock-last-sync-v1',
  CLOUDINARY_UPLOAD_URL: 'https://api.cloudinary.com/v1_1/hxpok4vc/auto/upload',
  CLOUDINARY_PRESET: 'infinity_stock',
  CLOUDINARY_FOLDER: 'infinity-stock',
};

export interface AuthSession {
  idToken: string;
  refreshToken: string;
  email: string;
  expiresAt: number;
}

/**
 * Signs in via Firebase Identity Toolkit REST API
 */
export async function signInWithEmailPassword(
  email: string,
  password: string,
  apiKey = FIREBASE_CONSTANTS.API_KEY
): Promise<AuthSession> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Login failed. Please check your credentials.');
  }

  const expiresInSec = Number(data.expiresIn || 3600);
  const session: AuthSession = {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    email: data.email,
    expiresAt: Date.now() + expiresInSec * 1000,
  };

  try {
    localStorage.setItem(FIREBASE_CONSTANTS.AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Could not persist auth to localStorage', err);
  }

  return session;
}

/**
 * Refreshes session token
 */
export async function refreshAuthSession(
  refreshToken: string,
  apiKey = FIREBASE_CONSTANTS.API_KEY
): Promise<AuthSession> {
  const url = `https://securetoken.googleapis.com/v1/token?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Could not refresh session');
  }

  const expiresInSec = Number(data.expires_in || 3600);
  const session: AuthSession = {
    idToken: data.id_token,
    refreshToken: data.refresh_token || refreshToken,
    email: data.user_id || '',
    expiresAt: Date.now() + expiresInSec * 1000,
  };

  try {
    localStorage.setItem(FIREBASE_CONSTANTS.AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Could not persist refreshed auth', err);
  }

  return session;
}

/**
 * Load stored auth session
 */
export function getStoredAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(FIREBASE_CONSTANTS.AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session?.idToken && session?.expiresAt > Date.now()) {
      return session;
    }
  } catch (err) {
    console.warn('Failed parsing stored auth session', err);
  }
  return null;
}

/**
 * Clear stored auth session
 */
export function clearStoredAuthSession(): void {
  try {
    localStorage.removeItem(FIREBASE_CONSTANTS.AUTH_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Preserved function: getStockEntries
 * Fetches all stock entries from Firestore collection `stockEntries`
 */
export async function getStockEntries(
  idToken?: string,
  projectId = FIREBASE_CONSTANTS.PROJECT_ID
): Promise<{ documents: StockEntry[]; rawCount: number }> {
  const allDocs: any[] = [];
  let pageToken = '';
  let pagesCount = 0;

  do {
    const params = new URLSearchParams({
      pageSize: '1000',
      _: String(Date.now()),
    });
    if (pageToken) params.set('pageToken', pageToken);

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${FIREBASE_CONSTANTS.COLLECTION_NAME}?${params.toString()}`;
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `Could not load stock entries from ${FIREBASE_CONSTANTS.COLLECTION_NAME}`);
    }

    if (Array.isArray(data?.documents)) {
      allDocs.push(...data.documents);
    }

    pageToken = String(data?.nextPageToken || '');
    pagesCount++;
    if (pagesCount > 100) {
      throw new Error('Firestore returned too many pages while loading stock entries');
    }
  } while (pageToken);

  const parsed = allDocs.map((doc, idx) => parseFirestoreDocument(doc, idx));

  // Update local cache
  try {
    localStorage.setItem(FIREBASE_CONSTANTS.STOCK_CACHE_KEY, JSON.stringify(parsed));
    localStorage.setItem(FIREBASE_CONSTANTS.LAST_SYNC_KEY, new Date().toISOString());
  } catch (err) {
    console.warn('Failed to cache stock entries locally', err);
  }

  return { documents: parsed, rawCount: allDocs.length };
}

/**
 * Preserved function: getStockEntriesSince
 * Incremental query for recent changes
 */
export async function getStockEntriesSince(
  idToken: string,
  timestampIso: string,
  projectId = FIREBASE_CONSTANTS.PROJECT_ID
): Promise<StockEntry[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: FIREBASE_CONSTANTS.COLLECTION_NAME }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'createdAt' },
            op: 'GREATER_THAN',
            value: { timestampValue: timestampIso },
          },
        },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }],
        limit: 5000,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Could not load recent stock changes');
  }

  if (Array.isArray(data)) {
    return data
      .map((item, idx) => (item?.document ? parseFirestoreDocument(item.document, idx) : null))
      .filter((e): e is StockEntry => e !== null);
  }

  return [];
}

/**
 * Preserved function: saveStockEntry
 * Writes new entry to Firestore collection `stockEntries`
 */
export async function saveStockEntry(
  idToken: string,
  entry: Omit<StockEntry, 'id' | 'createdAt'> & { createdAt?: string },
  projectId = FIREBASE_CONSTANTS.PROJECT_ID
): Promise<StockEntry> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${FIREBASE_CONSTANTS.COLLECTION_NAME}`;
  const payload = formatFirestoreDocument(entry);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Could not save stock entry to Firestore');
  }

  if (!data?.name) {
    throw new Error('Firestore did not return a document confirmation');
  }

  return parseFirestoreDocument(data);
}

/**
 * Preserved function: deleteStockEntry
 * Soft delete (moves to Recycle Bin via `[RECYCLE_BIN]` remark prefix)
 * or true document deletion if requested.
 */
export async function deleteStockEntry(
  idToken: string,
  entryId: string,
  softDelete = true,
  existingRemarks = '',
  projectId = FIREBASE_CONSTANTS.PROJECT_ID
): Promise<void> {
  if (softDelete) {
    const cleaned = existingRemarks.replace('[RECYCLE_BIN]', '').trim();
    const newRemarks = `[RECYCLE_BIN] ${cleaned}`.trim();
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${FIREBASE_CONSTANTS.COLLECTION_NAME}/${encodeURIComponent(entryId)}?updateMask.fieldPaths=remarks&updateMask.fieldPaths=createdAt`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          remarks: { stringValue: newRemarks },
          createdAt: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Could not move stock to Recycle Bin');
    }
  } else {
    // Permanent document delete
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${FIREBASE_CONSTANTS.COLLECTION_NAME}/${encodeURIComponent(entryId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || 'Could not permanently delete stock entry');
    }
  }
}

/**
 * Restores an entry from the Recycle Bin
 */
export async function restoreStockEntry(
  idToken: string,
  entryId: string,
  existingRemarks: string,
  projectId = FIREBASE_CONSTANTS.PROJECT_ID
): Promise<void> {
  const newRemarks = existingRemarks.replace('[RECYCLE_BIN]', '').trim();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${FIREBASE_CONSTANTS.COLLECTION_NAME}/${encodeURIComponent(entryId)}?updateMask.fieldPaths=remarks&updateMask.fieldPaths=createdAt`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        remarks: { stringValue: newRemarks },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Could not restore stock entry');
  }
}

/**
 * Uploads photo or PDF to Cloudinary
 */
export async function uploadAttachment(file: File): Promise<string> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/');

  if (!isImage && !isPdf) {
    throw new Error('Only image or PDF files are supported');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', FIREBASE_CONSTANTS.CLOUDINARY_PRESET);
  formData.append('folder', FIREBASE_CONSTANTS.CLOUDINARY_FOLDER);

  const res = await fetch(FIREBASE_CONSTANTS.CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || 'File upload failed');
  }

  const secureUrl = data?.secure_url;
  if (!secureUrl) {
    throw new Error('Upload succeeded but no secure URL was returned');
  }

  return secureUrl;
}

/**
 * Safe connection test - verifies access to project without modifying data
 */
export async function testFirebaseConnection(
  idToken?: string,
  projectId = FIREBASE_CONSTANTS.PROJECT_ID
): Promise<{ success: boolean; message: string; recordCount?: number }> {
  try {
    const params = new URLSearchParams({ pageSize: '5' });
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${FIREBASE_CONSTANTS.COLLECTION_NAME}?${params.toString()}`;
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache, no-store',
    };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

    const res = await fetch(url, { method: 'GET', headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          message: 'Connection reached Firebase! Authentication is required to read stockEntries (Private Collection). Sign in with warehouse or admin account.',
        };
      }
      return {
        success: false,
        message: data?.error?.message || `HTTP ${res.status}: Unable to connect to Firestore`,
      };
    }

    const docs = Array.isArray(data?.documents) ? data.documents : [];
    return {
      success: true,
      message: `Successfully connected to collection '${FIREBASE_CONSTANTS.COLLECTION_NAME}' in project '${projectId}'. Schema verified!`,
      recordCount: docs.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error reaching Firestore REST endpoint',
    };
  }
}
