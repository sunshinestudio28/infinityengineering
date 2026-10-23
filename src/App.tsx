import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes,
  LayoutDashboard,
  ClipboardList,
  Package,
  BarChart3,
  PlusCircle,
  MinusCircle,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';
import { StockEntry, StockMovementType } from './types/inventory';
import { SEED_STOCK_ENTRIES } from './data/seedData';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { StockLedgerView } from './components/StockLedgerView';
import { ModelsCatalogView } from './components/ModelsCatalogView';
import { ReportsView } from './components/ReportsView';
import { StockEntryModal } from './components/StockEntryModal';
import { EntryDetailModal } from './components/EntryDetailModal';
import { ImportExportModal } from './components/ImportExportModal';
import { DatabaseSettingsModal } from './components/DatabaseSettingsModal';
import { RecycleBinModal } from './components/RecycleBinModal';
import { LoginModal } from './components/LoginModal';
import {
  FIREBASE_CONSTANTS,
  AuthSession,
  getStoredAuthSession,
  clearStoredAuthSession,
  getStockEntries,
  saveStockEntry,
  deleteStockEntry,
  restoreStockEntry,
  testFirebaseConnection,
} from './services/firebaseConfig';
import { isRecycleBinEntry } from './utils/stockCalculations';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'catalog' | 'reports'>('dashboard');

  // Inventory entries state (Starts completely empty for manual entry)
  const [entries, setEntries] = useState<StockEntry[]>(() => {
    try {
      localStorage.removeItem(FIREBASE_CONSTANTS.STOCK_CACHE_KEY);
    } catch (e) {
      // ignore
    }
    return [];
  });

  // Auth and Sync state
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProductionVerified, setIsProductionVerified] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals state
  const [isStockEntryModalOpen, setIsStockEntryModalOpen] = useState(false);
  const [modalType, setModalType] = useState<StockMovementType>('Stock In');
  const [modalInitialModel, setModalInitialModel] = useState('');
  const [editingEntry, setEditingEntry] = useState<StockEntry | null>(null);

  const [selectedEntryDetail, setSelectedEntryDetail] = useState<StockEntry | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isDatabaseSettingsOpen, setIsDatabaseSettingsOpen] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<StockEntry | null>(null);

  // Recycle bin count
  const recycleBinCount = useMemo(() => {
    return entries.filter((e) => isRecycleBinEntry(e)).length;
  }, [entries]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Sync with Firestore if authenticated
  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (authSession) {
        const { documents } = await getStockEntries();
        if (documents.length > 0) {
          setEntries(documents);
          setIsProductionVerified(true);
          showToast(`Synced ${documents.length} records directly from Firestore collection.`);
        } else {
          showToast('Connected to Firestore: Collection currently contains 0 records.', 'info');
        }
      } else {
        // Safe check
        const testRes = await testFirebaseConnection();
        if (testRes.success) {
          setIsProductionVerified(true);
          showToast(testRes.message, 'info');
        } else {
          showToast('Running in Verified Safe Preview Mode with authentic stock data.', 'info');
        }
      }
    } catch (err: any) {
      console.warn('Sync notice:', err.message);
      showToast(`Database Note: ${err.message}. Local cached stock preserved.`, 'info');
    } finally {
      setIsRefreshing(false);
    }
  }, [authSession]);

  // Initial sync check
  useEffect(() => {
    handleRefreshData();
  }, []);

  // Save new or edited entry
  const handleSaveStockEntry = async (
    entryData: Omit<StockEntry, 'id' | 'createdAt'> & { id?: string }
  ) => {
    if (authSession && isProductionVerified) {
      // Live production write
      try {
        const saved = await saveStockEntry(entryData);
        setEntries((prev) => {
          const updated = prev.some((e) => e.id === saved.id)
            ? prev.map((e) => (e.id === saved.id ? saved : e))
            : [saved, ...prev];
          localStorage.setItem(FIREBASE_CONSTANTS.STOCK_CACHE_KEY, JSON.stringify(updated));
          return updated;
        });
        showToast(`Saved to Firestore production: ${saved.modelNumber} (${saved.type})`);
        return;
      } catch (err: any) {
        console.error('Firestore save failed, persisting locally:', err);
        throw err;
      }
    }

    // Local / Safe Staging Mode (preserves data locally without writing unverified records to production)
    const newEntry: StockEntry = {
      id: entryData.id || `doc-${Date.now()}`,
      date: entryData.date,
      type: entryData.type,
      category: entryData.category,
      modelNumber: entryData.modelNumber,
      modelName: entryData.modelName,
      serialNumber: entryData.serialNumber,
      hp: entryData.hp,
      phase: entryData.phase,
      kw: entryData.kw,
      quantity: entryData.quantity,
      party: entryData.party,
      invoiceNumber: entryData.invoiceNumber,
      photo: entryData.photo,
      remarks: entryData.remarks,
      createdAt: new Date().toISOString(),
    };

    setEntries((prev) => {
      const exists = prev.some((e) => e.id === newEntry.id);
      const updated = exists ? prev.map((e) => (e.id === newEntry.id ? newEntry : e)) : [newEntry, ...prev];
      try {
        localStorage.setItem(FIREBASE_CONSTANTS.STOCK_CACHE_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });

    showToast(
      `Recorded ${newEntry.type}: ${newEntry.modelNumber} (${newEntry.quantity} units) in safe staging.`
    );
  };

  // Move to Recycle Bin (Soft Delete)
  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    const entry = entryToDelete;

    try {
      if (authSession && isProductionVerified) {
        await deleteStockEntry(entry.id, true, entry.remarks);
      }

      // Update local state
      const cleaned = (entry.remarks || '').replace('[RECYCLE_BIN]', '').trim();
      const updatedRemarks = `[RECYCLE_BIN] ${cleaned}`.trim();

      setEntries((prev) => {
        const updated = prev.map((e) => (e.id === entry.id ? { ...e, remarks: updatedRemarks } : e));
        localStorage.setItem(FIREBASE_CONSTANTS.STOCK_CACHE_KEY, JSON.stringify(updated));
        return updated;
      });

      showToast(`Moved ${entry.modelNumber} to Recycle Bin. You can restore it anytime.`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setEntryToDelete(null);
    }
  };

  // Restore from Recycle Bin
  const handleRestoreEntry = async (entry: StockEntry) => {
    try {
      if (authSession && isProductionVerified) {
        await restoreStockEntry(entry.id, entry.remarks);
      }

      const restoredRemarks = (entry.remarks || '').replace('[RECYCLE_BIN]', '').trim();

      setEntries((prev) => {
        const updated = prev.map((e) => (e.id === entry.id ? { ...e, remarks: restoredRemarks } : e));
        localStorage.setItem(FIREBASE_CONSTANTS.STOCK_CACHE_KEY, JSON.stringify(updated));
        return updated;
      });

      showToast(`Restored ${entry.modelNumber} to active stock.`);
    } catch (err: any) {
      showToast(`Error restoring: ${err.message}`, 'error');
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (entry: StockEntry) => {
    if (!window.confirm(`Permanently delete ${entry.modelNumber} from records? This cannot be undone.`)) {
      return;
    }

    try {
      if (authSession && isProductionVerified) {
        await deleteStockEntry(entry.id, false, entry.remarks);
      }

      setEntries((prev) => {
        const updated = prev.filter((e) => e.id !== entry.id);
        localStorage.setItem(FIREBASE_CONSTANTS.STOCK_CACHE_KEY, JSON.stringify(updated));
        return updated;
      });

      showToast(`Permanently deleted ${entry.modelNumber}.`);
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // Import CSV batch
  const handleImportBatch = async (batch: Partial<StockEntry>[]) => {
    const formatted: StockEntry[] = batch.map((item, idx) => ({
      id: `imported-${Date.now()}-${idx}`,
      date: item.date || new Date().toISOString().split('T')[0],
      type: item.type || 'Stock In',
      category: item.category || 'Motors / Pumps',
      modelNumber: item.modelNumber || 'Unspecified',
      modelName: item.modelName || '',
      serialNumber: item.serialNumber || '',
      hp: item.hp || '',
      phase: item.phase || 'NA',
      kw: item.kw || '',
      quantity: Number(item.quantity) || 1,
      party: item.party || '',
      invoiceNumber: item.invoiceNumber || '',
      photo: item.photo || '',
      remarks: item.remarks || '',
      createdAt: new Date().toISOString(),
    }));

    setEntries((prev) => {
      const updated = [...formatted, ...prev];
      localStorage.setItem(FIREBASE_CONSTANTS.STOCK_CACHE_KEY, JSON.stringify(updated));
      return updated;
    });

    showToast(`Successfully imported ${formatted.length} stock movements.`);
  };

  const handleSignOut = () => {
    clearStoredAuthSession();
    setAuthSession(null);
    setIsLoginModalOpen(true);
    showToast('Signed out of warehouse session.', 'info');
  };

  // Enforce mandatory Firebase authentication check before exposing dashboard/CRM
  if (!authSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        {/* Toast Notification */}
        {notification && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 bg-slate-900 text-white border-slate-700"
          >
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            <span>{notification.message}</span>
          </div>
        )}

        <LoginModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={(session) => {
            setAuthSession(session);
            showToast(`Authenticated as ${session.email}`);
            handleRefreshData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white pb-16 md:pb-6 w-full max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 md:bottom-6 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition animate-in slide-in-from-bottom duration-200 ${
            notification.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : notification.type === 'info'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-emerald-900 text-white border-emerald-700'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-300" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-300" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenStockIn={() => {
          setEditingEntry(null);
          setModalType('Stock In');
          setModalInitialModel('');
          setIsStockEntryModalOpen(true);
        }}
        onOpenStockOut={() => {
          setEditingEntry(null);
          setModalType('Stock Out');
          setModalInitialModel('');
          setIsStockEntryModalOpen(true);
        }}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onOpenDatabaseSettings={() => setIsDatabaseSettingsOpen(true)}
        onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
        onRefreshData={handleRefreshData}
        isRefreshing={isRefreshing}
        recycleBinCount={recycleBinCount}
        authSession={authSession}
        onOpenAuthModal={() => setIsLoginModalOpen(true)}
        onSignOut={handleSignOut}
        isProductionVerified={isProductionVerified}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {activeTab === 'dashboard' && (
          <DashboardView
            entries={entries}
            onOpenStockIn={() => {
              setEditingEntry(null);
              setModalType('Stock In');
              setModalInitialModel('');
              setIsStockEntryModalOpen(true);
            }}
            onOpenStockOut={(prefillModel) => {
              setEditingEntry(null);
              setModalType('Stock Out');
              setModalInitialModel(prefillModel || '');
              setIsStockEntryModalOpen(true);
            }}
            onSelectEntry={(entry) => setSelectedEntryDetail(entry)}
            onNavigateToLedger={() => setActiveTab('ledger')}
            onNavigateToCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'ledger' && (
          <StockLedgerView
            entries={entries}
            onSelectEntry={(entry) => setSelectedEntryDetail(entry)}
            onOpenStockIn={() => {
              setEditingEntry(null);
              setModalType('Stock In');
              setModalInitialModel('');
              setIsStockEntryModalOpen(true);
            }}
            onOpenStockOut={() => {
              setEditingEntry(null);
              setModalType('Stock Out');
              setModalInitialModel('');
              setIsStockEntryModalOpen(true);
            }}
            onDeleteEntry={(entry) => setEntryToDelete(entry)}
            onExportCsv={() => setIsImportExportOpen(true)}
          />
        )}

        {activeTab === 'catalog' && (
          <ModelsCatalogView
            entries={entries}
            onOpenStockInForModel={(modelNum, hp, phase, kw) => {
              setEditingEntry(null);
              setModalType('Stock In');
              setModalInitialModel(modelNum);
              setIsStockEntryModalOpen(true);
            }}
            onOpenStockOutForModel={(modelNum) => {
              setEditingEntry(null);
              setModalType('Stock Out');
              setModalInitialModel(modelNum);
              setIsStockEntryModalOpen(true);
            }}
            onSelectEntry={(entry) => setSelectedEntryDetail(entry)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView entries={entries} onExportCsv={() => setIsImportExportOpen(true)} />
        )}
      </main>

      {/* Mobile Bottom Quick-Bar for Thumb Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 flex items-center justify-around py-2 px-1 text-white shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
            activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
            activeTab === 'ledger' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Ledger</span>
        </button>

        {/* Floating In/Out Action Center */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setEditingEntry(null);
              setModalType('Stock In');
              setModalInitialModel('');
              setIsStockEntryModalOpen(true);
            }}
            className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow active:scale-95"
            aria-label="Stock In"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setEditingEntry(null);
              setModalType('Stock Out');
              setModalInitialModel('');
              setIsStockEntryModalOpen(true);
            }}
            className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center text-white shadow active:scale-95"
            aria-label="Stock Out"
          >
            <MinusCircle className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
            activeTab === 'catalog' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Models</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium transition ${
            activeTab === 'reports' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Reports</span>
        </button>
      </div>

      {/* Stock In / Stock Out Form Modal */}
      <StockEntryModal
        isOpen={isStockEntryModalOpen}
        onClose={() => {
          setIsStockEntryModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveStockEntry}
        existingEntries={entries}
        initialType={modalType}
        initialModelNumber={modalInitialModel}
        initialEntry={editingEntry}
      />

      {/* Voucher / Detail View Modal */}
      <EntryDetailModal
        entry={selectedEntryDetail}
        isOpen={!!selectedEntryDetail}
        onClose={() => setSelectedEntryDetail(null)}
        onEdit={(entry) => {
          setEditingEntry(entry);
          setModalType(entry.type);
          setModalInitialModel(entry.modelNumber);
          setIsStockEntryModalOpen(true);
        }}
        onDelete={(entry) => setEntryToDelete(entry)}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        entries={entries}
        onImportEntries={handleImportBatch}
      />

      {/* Database Diagnostics & Firebase Modal */}
      <DatabaseSettingsModal
        isOpen={isDatabaseSettingsOpen}
        onClose={() => setIsDatabaseSettingsOpen(false)}
        authSession={authSession}
        onAuthSuccess={(session) => {
          setAuthSession(session);
          showToast(`Authenticated as ${session.email}.`);
          handleRefreshData();
        }}
        isProductionVerified={isProductionVerified}
        setIsProductionVerified={setIsProductionVerified}
        entriesCount={entries.length}
      />

      {/* Recycle Bin Modal */}
      <RecycleBinModal
        isOpen={isRecycleBinOpen}
        onClose={() => setIsRecycleBinOpen(false)}
        entries={entries}
        onRestore={handleRestoreEntry}
        onPermanentDelete={handlePermanentDelete}
      />

      {/* Login Modal with New Company Logo */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={(session) => {
          setAuthSession(session);
          showToast(`Authenticated as ${session.email}`);
          handleRefreshData();
        }}
      />

      {/* Soft Delete Confirmation Modal */}
      {entryToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-base font-bold text-slate-900">
                  Move to Recycle Bin?
                </h3>
                <p className="text-xs text-slate-500">
                  Entry will be hidden from active inventory. You can restore it anytime.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Model:</span>
                <strong className="font-mono text-slate-900">{entryToDelete.modelNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type & Qty:</span>
                <span className="font-bold">
                  {entryToDelete.type} ({entryToDelete.quantity} units)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span>{entryToDelete.date}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition"
              >
                Move to Recycle Bin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
