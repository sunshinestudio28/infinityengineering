import React from 'react';
import {
  X,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Boxes,
  CheckCircle2,
} from 'lucide-react';
import { StockEntry } from '../types/inventory';
import { isRecycleBinEntry } from '../utils/stockCalculations';

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: StockEntry[];
  onRestore: (entry: StockEntry) => Promise<void>;
  onPermanentDelete: (entry: StockEntry) => Promise<void>;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  isOpen,
  onClose,
  entries,
  onRestore,
  onPermanentDelete,
}) => {
  if (!isOpen) return null;

  const recycledEntries = entries.filter((e) => isRecycleBinEntry(e));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-600 text-white">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Recycle Bin (Soft Deleted Stock)</h2>
              <p className="text-xs text-slate-300">
                Safely recover or permanently remove deleted inventory entries
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {recycledEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Trash2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">Recycle Bin is empty</p>
              <p className="text-xs text-slate-400 mt-1">
                When entries are deleted from the Stock Ledger, they are placed here safely for review.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {recycledEntries.map((entry) => (
                <div key={entry.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 truncate">
                        {entry.modelNumber || entry.modelName}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                          entry.type === 'Stock In'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {entry.type} ({entry.quantity})
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Date: {entry.date || '—'}</span>
                      {entry.serialNumber && <span>SN: {entry.serialNumber}</span>}
                      {entry.party && <span>Party: {entry.party}</span>}
                    </div>

                    <div className="text-[11px] text-rose-700 italic mt-0.5">
                      {entry.remarks}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onRestore(entry)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1"
                      title="Restore to active inventory"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>

                    <button
                      onClick={() => onPermanentDelete(entry)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Permanently Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
