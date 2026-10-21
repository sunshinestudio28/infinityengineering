import React, { useState } from 'react';
import {
  X,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Key,
  Layers,
  RefreshCw,
  Eye,
  Server,
  LogIn,
} from 'lucide-react';
import {
  FIREBASE_CONSTANTS,
  testFirebaseConnection,
  signInWithEmailPassword,
  AuthSession,
} from '../services/firebaseConfig';

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  authSession: AuthSession | null;
  onAuthSuccess: (session: AuthSession) => void;
  isProductionVerified: boolean;
  setIsProductionVerified: (val: boolean) => void;
  entriesCount: number;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  authSession,
  onAuthSuccess,
  isProductionVerified,
  setIsProductionVerified,
  entriesCount,
}) => {
  const [testStatus, setTestStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    loading: boolean;
  }>({
    tested: false,
    success: false,
    message: '',
    loading: false,
  });

  // Auth form
  const [email, setEmail] = useState(FIREBASE_CONSTANTS.DEFAULT_USER_EMAIL);
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestStatus({ tested: false, success: false, message: '', loading: true });
    const result = await testFirebaseConnection(authSession?.idToken);
    setTestStatus({
      tested: true,
      success: result.success,
      message: result.message,
      loading: false,
    });
    if (result.success) {
      setIsProductionVerified(true);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const session = await signInWithEmailPassword(email, password);
      onAuthSuccess(session);
      setPassword('');
      // Auto test after signin
      const testRes = await testFirebaseConnection(session.idToken);
      setTestStatus({
        tested: true,
        success: testRes.success,
        message: testRes.message,
        loading: false,
      });
      if (testRes.success) {
        setIsProductionVerified(true);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-12 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs flex-shrink-0">
              <img
                src="/infinity-logo.jpeg"
                alt="Infinity Engineering"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Production Database & Firebase Diagnostics</h2>
              <p className="text-xs text-slate-300">
                Preserved configuration matching your existing Framer inventory system
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Production Safety Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-emerald-900 space-y-1">
              <strong className="block text-sm font-bold text-emerald-950">
                Zero-Destruction Production Guarantee
              </strong>
              <p>
                Your existing production database (<code>infinity-engineering-stock</code>) is preserved.
                All document IDs, schemas, calculations, and functions (<code>getStockEntries</code>,{' '}
                <code>getStockEntriesSince</code>, <code>saveStockEntry</code>, <code>deleteStockEntry</code>)
                are strictly respected. No collections will be wiped or reset.
              </p>
            </div>
          </div>

          {/* Detected Configuration Details */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-blue-600" />
              Verified Firestore Credentials & Schema
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">
                  Firebase Project ID
                </span>
                <span className="font-bold text-slate-900">{FIREBASE_CONSTANTS.PROJECT_ID}</span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">
                  Firestore Collection
                </span>
                <span className="font-bold text-blue-700">{FIREBASE_CONSTANTS.COLLECTION_NAME}</span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">
                  Admin Authorized Email
                </span>
                <span className="font-bold text-slate-900">{FIREBASE_CONSTANTS.ADMIN_EMAIL}</span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">
                  Default Warehouse Email
                </span>
                <span className="font-bold text-slate-900">{FIREBASE_CONSTANTS.DEFAULT_USER_EMAIL}</span>
              </div>
            </div>

            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">
                Web API Key (Identity Toolkit & SecureToken)
              </span>
              <span className="text-slate-700">{FIREBASE_CONSTANTS.API_KEY}</span>
            </div>
          </div>

          {/* Test Connection Button & Result */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Live Read-Only Connection Test</h4>
                <p className="text-xs text-slate-500">
                  Tests endpoint connectivity without modifying or altering existing records.
                </p>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testStatus.loading}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testStatus.loading ? 'animate-spin' : ''}`} />
                {testStatus.loading ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {testStatus.tested && (
              <div
                className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${
                  testStatus.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border border-amber-200 text-amber-900'
                }`}
              >
                {testStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                )}
                <div>{testStatus.message}</div>
              </div>
            )}
          </div>

          {/* Authentication Section */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-600" />
                Firebase Auth State
              </h4>
              {authSession ? (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                  Authenticated: {authSession.email}
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-600">
                  Not Signed In
                </span>
              )}
            </div>

            {authError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
                {authError}
              </div>
            )}

            {!authSession ? (
              <form onSubmit={handleSignIn} className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      User Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Enter warehouse password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {isSigningIn ? 'Signing in...' : 'Sign In to Connect Production Database'}
                </button>
              </form>
            ) : (
              <p className="text-xs text-slate-500">
                You are currently signed in. The app can read and sync directly with your live Firestore
                collection.
              </p>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
