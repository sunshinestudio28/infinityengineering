import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  signInWithCustomToken,
  signOut as fbSignOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { StockEntry, FirebaseConfigInfo } from '../types/inventory';

// Exact Firebase config for infinity-engineering-stock-new
export const firebaseConfig = {
  apiKey: "AIzaSyDkfyrRCYkQyjBH6bE8U83tTeYWUVK2Okg",
  authDomain: "infinity-engineering-stock-new.firebaseapp.com",
  projectId: "infinity-engineering-stock-new",
  storageBucket: "infinity-engineering-stock-new.firebasestorage.app",
  messagingSenderId: "586642778865",
  appId: "1:586642778865:web:44f13f14eed6df07a3d750",
  measurementId: "G-SD8HH2S1NK"
};

// Initialize shared Firebase app instance
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const FIREBASE_CONSTANTS = {
  PROJECT_ID: 'infinity-engineering-stock-new',
  COLLECTION_NAME: 'stockEntries',
  API_KEY: 'AIzaSyDkfyrRCYkQyjBH6bE8U83tTeYWUVK2Okg',
  ADMIN_EMAIL: 'itsrazz25@gmail.com',
  DEFAULT_USER_EMAIL: 'warehouse@infinityengineering.local',
  AUTH_STORAGE_KEY: 'infinity-engineering-auth-v3',
  STOCK_CACHE_KEY: 'infinity-engineering-stock-cache-v2',
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
 * Sign in with Firebase Auth SDK
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<AuthSession> {
  try {
    const userCredential = await fbSignInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();
    const refreshToken = user.refreshToken || '';
    const tokenResult = await user.getIdTokenResult();
    const expiresAt = new Date(tokenResult.expirationTime).getTime();

    const session: AuthSession = {
      idToken,
      refreshToken,
      email: user.email || email,
      expiresAt: isNaN(expiresAt) ? Date.now() + 3600 * 1000 : expiresAt,
    };

    try {
      localStorage.setItem(FIREBASE_CONSTANTS.AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      // ignore storage error
    }

    return session;
  } catch (err: any) {
    throw new Error(err?.message || 'Authentication failed. Please verify email and password.');
  }
}

/**
 * Refresh auth session
 */
export async function refreshAuthSession(refreshToken: string): Promise<AuthSession> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No active user session');
  }
  const idToken = await currentUser.getIdToken(true);
  const tokenResult = await currentUser.getIdTokenResult();
  const expiresAt = new Date(tokenResult.expirationTime).getTime();

  const session: AuthSession = {
    idToken,
    refreshToken: currentUser.refreshToken || refreshToken,
    email: currentUser.email || '',
    expiresAt: isNaN(expiresAt) ? Date.now() + 3600 * 1000 : expiresAt,
  };

  try {
    localStorage.setItem(FIREBASE_CONSTANTS.AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    // ignore
  }

  return session;
}

export function getStoredAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(FIREBASE_CONSTANTS.AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session?.idToken && session?.expiresAt > Date.now()) {
      return session;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function clearStoredAuthSession(): void {
  try {
    localStorage.removeItem(FIREBASE_CONSTANTS.AUTH_STORAGE_KEY);
    fbSignOut(auth).catch(() => {});
  } catch (e) {
    // ignore
  }
}

/**
 * Get all stock entries using official Firestore SDK
 */
export async function getStockEntries(): Promise<{ documents: StockEntry[]; rawCount: number }> {
  const colRef = collection(db, FIREBASE_CONSTANTS.COLLECTION_NAME);
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  const documents: StockEntry[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    documents.push({
      id: docSnap.id,
      date: data.date || new Date().toISOString().split('T')[0],
      type: data.type || 'Stock In',
      category: data.category || 'Motors / Pumps',
      modelNumber: data.modelNumber || '',
      modelName: data.modelName || '',
      serialNumber: data.serialNumber || '',
      hp: data.hp || '',
      phase: data.phase || 'NA',
      kw: data.kw || '',
      quantity: Number(data.quantity) || 1,
      party: data.party || '',
      invoiceNumber: data.invoiceNumber || '',
      photo: data.photo || '',
      remarks: data.remarks || '',
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
    });
  });

  try {
    localStorage.setItem(FIREBASE_CONSTANTS.STOCK_CACHE_KEY, JSON.stringify(documents));
  } catch (e) {
    // ignore
  }

  return { documents, rawCount: documents.length };
}

/**
 * Save new stock entry using official Firestore SDK
 */
export async function saveStockEntry(
  entryData: Omit<StockEntry, 'id' | 'createdAt'> & { id?: string }
): Promise<StockEntry> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to save stock entries.');
  }

  const colRef = collection(db, FIREBASE_CONSTANTS.COLLECTION_NAME);
  
  const payload = {
    date: entryData.date,
    type: entryData.type,
    category: entryData.category,
    modelNumber: entryData.modelNumber,
    modelName: entryData.modelName || '',
    serialNumber: entryData.serialNumber || '',
    hp: entryData.hp || '',
    phase: entryData.phase || 'NA',
    kw: entryData.kw || '',
    quantity: Number(entryData.quantity) || 1,
    party: entryData.party || '',
    invoiceNumber: entryData.invoiceNumber || '',
    photo: entryData.photo || '',
    remarks: entryData.remarks || '',
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
  };

  if (entryData.id && !entryData.id.startsWith('doc-') && !entryData.id.startsWith('imported-')) {
    // Update existing document
    const docRef = doc(db, FIREBASE_CONSTANTS.COLLECTION_NAME, entryData.id);
    await updateDoc(docRef, { ...payload, createdAt: Timestamp.now() });
    return {
      id: entryData.id,
      ...entryData,
      quantity: Number(entryData.quantity) || 1,
      createdAt: new Date().toISOString(),
    };
  } else {
    // Create new document
    const docRef = await addDoc(colRef, payload);
    return {
      id: docRef.id,
      date: entryData.date,
      type: entryData.type,
      category: entryData.category,
      modelNumber: entryData.modelNumber,
      modelName: entryData.modelName || '',
      serialNumber: entryData.serialNumber || '',
      hp: entryData.hp || '',
      phase: entryData.phase || 'NA',
      kw: entryData.kw || '',
      quantity: Number(entryData.quantity) || 1,
      party: entryData.party || '',
      invoiceNumber: entryData.invoiceNumber || '',
      photo: entryData.photo || '',
      remarks: entryData.remarks || '',
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Delete or soft-delete stock entry
 */
export async function deleteStockEntry(
  entryId: string,
  softDelete = true,
  existingRemarks = ''
): Promise<void> {
  const docRef = doc(db, FIREBASE_CONSTANTS.COLLECTION_NAME, entryId);
  if (softDelete) {
    const cleaned = existingRemarks.replace('[RECYCLE_BIN]', '').trim();
    const newRemarks = `[RECYCLE_BIN] ${cleaned}`.trim();
    await updateDoc(docRef, { remarks: newRemarks, createdAt: serverTimestamp() });
  } else {
    await deleteDoc(docRef);
  }
}

/**
 * Restore stock entry from recycle bin
 */
export async function restoreStockEntry(
  entryId: string,
  existingRemarks: string
): Promise<void> {
  const docRef = doc(db, FIREBASE_CONSTANTS.COLLECTION_NAME, entryId);
  const newRemarks = existingRemarks.replace('[RECYCLE_BIN]', '').trim();
  await updateDoc(docRef, { remarks: newRemarks, createdAt: serverTimestamp() });
}

/**
 * Upload attachment to Cloudinary
 */
export async function uploadAttachment(file: File): Promise<string> {
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

  return data?.secure_url || '';
}

/**
 * Test Firebase connection with SDK
 */
export async function testFirebaseConnection(): Promise<{ success: boolean; message: string; recordCount?: number }> {
  try {
    const colRef = collection(db, FIREBASE_CONSTANTS.COLLECTION_NAME);
    const snapshot = await getDocs(colRef);
    return {
      success: true,
      message: `Successfully connected to Firestore project '${firebaseConfig.projectId}' collection '${FIREBASE_CONSTANTS.COLLECTION_NAME}' via Firebase SDK!`,
      recordCount: snapshot.size,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Firestore via SDK',
    };
  }
}
