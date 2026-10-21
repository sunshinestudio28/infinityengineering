import React, { useState } from 'react';
import { X, Lock, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import {
  FIREBASE_CONSTANTS,
  signInWithEmailPassword,
  AuthSession,
} from '../services/firebaseConfig';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
  defaultEmail?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultEmail = FIREBASE_CONSTANTS.DEFAULT_USER_EMAIL,
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await signInWithEmailPassword(email, password);
      onSuccess(session);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 text-center">
          {/* New Company Logo Prominently Featured */}
          <div className="w-48 sm:w-56 mx-auto mb-4 p-2 bg-white rounded-xl shadow-xs border border-slate-100">
            <img
              src="/infinity-logo.jpeg"
              alt="Infinity Engineering Logo"
              className="w-full h-auto object-contain"
            />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Infinity Engineering Stock
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Private Inventory Management Portal
          </p>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 text-left">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Authorized Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="warehouse@infinityengineering.local"
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
            Access is private. Only authorized users can manage stock records and dispatches.
          </p>
        </div>
      </div>
    </div>
  );
};
