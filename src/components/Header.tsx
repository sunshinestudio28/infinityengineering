import React from 'react';
import {
  Boxes,
  PlusCircle,
  MinusCircle,
  Database,
  Trash2,
  FileSpreadsheet,
  LogIn,
  LogOut,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { AuthSession } from '../services/firebaseConfig';

interface HeaderProps {
  activeTab: 'dashboard' | 'ledger' | 'catalog' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'ledger' | 'catalog' | 'reports') => void;
  onOpenStockIn: () => void;
  onOpenStockOut: () => void;
  onOpenImportExport: () => void;
  onOpenDatabaseSettings: () => void;
  onOpenRecycleBin: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  recycleBinCount: number;
  authSession: AuthSession | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  isProductionVerified: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenStockIn,
  onOpenStockOut,
  onOpenImportExport,
  onOpenDatabaseSettings,
  onOpenRecycleBin,
  onRefreshData,
  isRefreshing,
  recycleBinCount,
  authSession,
  onOpenAuthModal,
  onSignOut,
  isProductionVerified,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      {/* Top Banner / Corporate Industrial Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 sm:h-10 w-13 sm:w-14 rounded-lg bg-white p-1 flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-700/60 overflow-hidden">
              <img
                src="/infinity-logo.jpeg"
                alt="Infinity Engineering Group"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black tracking-wider text-base sm:text-lg uppercase text-white truncate">
                  Infinity Engineering
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded">
                  KSB Partner
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden xs:block truncate">
                Industrial Pumps, Motors & Spares Inventory
              </p>
            </div>
          </div>

          {/* Quick Action Buttons & Status Indicators */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Quick Stock In / Stock Out Buttons */}
            <button
              onClick={onOpenStockIn}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label="Stock In"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Stock In</span>
            </button>

            <button
              onClick={onOpenStockOut}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label="Stock Out"
            >
              <MinusCircle className="w-4 h-4" />
              <span>Stock Out</span>
            </button>

            {/* CSV Import/Export */}
            <button
              onClick={onOpenImportExport}
              title="Import or Export CSV / Excel"
              className="hidden sm:flex p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition items-center gap-1.5"
              aria-label="Import or Export"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">CSV / Excel</span>
            </button>

            {/* Database / Connection Status */}
            <button
              onClick={onOpenDatabaseSettings}
              title="Firebase & Database Connection Status"
              className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-md border transition flex items-center gap-1.5 ${
                isProductionVerified
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-blue-950/60 border-blue-700/60 text-blue-300 hover:bg-blue-900/60'
              }`}
              aria-label="Database Status"
            >
              <Database className="w-4 h-4" />
              <span className="hidden lg:inline">
                {isProductionVerified ? 'Firebase Live' : 'Database Settings'}
              </span>
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isProductionVerified ? 'bg-emerald-400' : 'bg-blue-400'
                }`}
              />
            </button>

            {/* Recycle Bin */}
            <button
              onClick={onOpenRecycleBin}
              title="Recycle Bin (Soft Deleted Stock)"
              className="relative p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1"
              aria-label="Recycle Bin"
            >
              <Trash2 className="w-4 h-4 text-slate-400" />
              {recycleBinCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold leading-none text-rose-100 bg-rose-600 rounded-full">
                  {recycleBinCount}
                </span>
              )}
            </button>

            {/* Sync / Refresh */}
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              title="Refresh and sync stock"
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              aria-label="Refresh Stock"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Auth / User session */}
            {authSession ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-700">
                <span className="hidden xl:inline-block text-xs text-slate-300 font-mono max-w-[130px] truncate" title={authSession.email}>
                  {authSession.email}
                </span>
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 transition"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition"
                aria-label="Sign In"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex space-x-1 sm:space-x-3 border-t border-slate-800 py-2 overflow-x-auto scrollbar-none" aria-label="Main Navigation">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md whitespace-nowrap transition ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md whitespace-nowrap transition ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Stock Ledger & Movements
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md whitespace-nowrap transition ${
              activeTab === 'catalog'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Products & Models (250+)
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md whitespace-nowrap transition ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Reports & Audit
          </button>
        </nav>
      </div>
    </header>
  );
};
