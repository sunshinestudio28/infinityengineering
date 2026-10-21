import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  PackageCheck,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  MinusCircle,
  History,
  X,
  Boxes,
  Zap,
} from 'lucide-react';
import { StockEntry, ModelSummary } from '../types/inventory';
import { calculateModelBalances } from '../utils/stockCalculations';
import { KNOWN_MODELS } from '../data/knownModels';

interface ModelsCatalogViewProps {
  entries: StockEntry[];
  onOpenStockInForModel: (modelNumber: string, hp?: string, phase?: string, kw?: string) => void;
  onOpenStockOutForModel: (modelNumber: string, availableBalance: number) => void;
  onSelectEntry: (entry: StockEntry) => void;
}

export const ModelsCatalogView: React.FC<ModelsCatalogViewProps> = ({
  entries,
  onOpenStockInForModel,
  onOpenStockOutForModel,
  onSelectEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<'All' | '1 PH' | '3 PH'>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'in_stock' | 'low_stock' | 'out_of_stock'>('All');
  const [selectedModelForHistory, setSelectedModelForHistory] = useState<string | null>(null);

  // Calculate live balances for models in the transaction history
  const recordedBalances = useMemo(() => {
    return calculateModelBalances(entries);
  }, [entries]);

  // Combine recorded models with catalog of all 254 known models
  const combinedCatalog = useMemo(() => {
    const map = new Map<string, ModelSummary>();

    // First populate from known catalog
    for (const km of KNOWN_MODELS) {
      const key = km.modelNumber.trim().toUpperCase();
      map.set(key, {
        modelNumber: km.modelNumber,
        category: km.category,
        hp: km.hp,
        phase: km.phase,
        kw: km.kw,
        stockInTotal: 0,
        stockOutTotal: 0,
        currentBalance: 0,
        activeSerialNumbers: [],
      });
    }

    // Merge in actual recorded transaction summaries
    for (const recorded of recordedBalances) {
      const key = recorded.modelNumber.trim().toUpperCase();
      const existing = map.get(key);
      if (existing) {
        existing.stockInTotal = recorded.stockInTotal;
        existing.stockOutTotal = recorded.stockOutTotal;
        existing.currentBalance = recorded.currentBalance;
        existing.activeSerialNumbers = recorded.activeSerialNumbers;
        existing.lastMovementDate = recorded.lastMovementDate;
        if (recorded.hp) existing.hp = recorded.hp;
        if (recorded.phase && recorded.phase !== 'NA') existing.phase = recorded.phase;
        if (recorded.kw) existing.kw = recorded.kw;
      } else {
        map.set(key, recorded);
      }
    }

    return Array.from(map.values());
  }, [recordedBalances]);

  // Filter models
  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return combinedCatalog.filter((model) => {
      if (phaseFilter !== 'All' && model.phase !== phaseFilter) {
        return false;
      }

      if (stockStatusFilter === 'in_stock' && model.currentBalance <= 0) return false;
      if (stockStatusFilter === 'low_stock' && (model.currentBalance <= 0 || model.currentBalance > 2)) return false;
      if (stockStatusFilter === 'out_of_stock' && model.currentBalance > 0) return false;

      if (q) {
        const matchNum = model.modelNumber.toLowerCase().includes(q);
        const matchHp = (model.hp || '').toLowerCase().includes(q);
        const matchKw = (model.kw || '').toLowerCase().includes(q);
        return matchNum || matchHp || matchKw;
      }

      return true;
    });
  }, [combinedCatalog, searchQuery, phaseFilter, stockStatusFilter]);

  // History for drawer
  const modelHistoryEntries = useMemo(() => {
    if (!selectedModelForHistory) return [];
    const target = selectedModelForHistory.trim().toUpperCase();
    return entries
      .filter(
        (e) =>
          !String(e.remarks || '').includes('[RECYCLE_BIN]') &&
          (e.modelNumber || e.modelName || '').trim().toUpperCase() === target
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [entries, selectedModelForHistory]);

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product catalog (ETN, AQUA, OPAL, PERISTAR, KHM, etc.)..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Phase filter */}
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as any)}
              className="py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700"
            >
              <option value="All">All Phases</option>
              <option value="1 PH">1 Phase (1 PH)</option>
              <option value="3 PH">3 Phase (3 PH)</option>
            </select>

            {/* Stock status filter */}
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700"
            >
              <option value="All">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt; 0)</option>
              <option value="low_stock">Low Stock (&le; 2)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>
        </div>

        {/* Count summary */}
        <div className="text-xs text-slate-500 flex items-center justify-between">
          <span>
            Displaying <strong className="text-slate-900">{filteredModels.length}</strong> industrial models
          </span>
          <span className="hidden sm:inline text-slate-400">
            Click any model to view transaction ledger & quick dispatch
          </span>
        </div>
      </div>

      {/* Grid of Product Models */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredModels.map((model) => {
          const hasStock = model.currentBalance > 0;
          const isLow = model.currentBalance > 0 && model.currentBalance <= 2;
          const isOut = model.currentBalance <= 0;

          return (
            <div
              key={model.modelNumber}
              className={`bg-white rounded-xl p-4 border transition hover:shadow-md flex flex-col justify-between ${
                hasStock ? 'border-slate-200 hover:border-blue-300' : 'border-slate-100 opacity-90'
              }`}
            >
              <div>
                {/* Header: Model & Balance Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-mono font-bold text-sm text-slate-900 truncate" title={model.modelNumber}>
                      {model.modelNumber}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{model.category}</p>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
                      isOut
                        ? 'bg-slate-100 text-slate-500'
                        : isLow
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {model.currentBalance} in stock
                  </span>
                </div>

                {/* Specs row */}
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  {model.hp && (
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-mono font-semibold rounded">
                      {model.hp} HP
                    </span>
                  )}
                  {model.phase && model.phase !== 'NA' && (
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-semibold rounded">
                      {model.phase}
                    </span>
                  )}
                  {model.kw && (
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono rounded">
                      {model.kw} kW
                    </span>
                  )}
                  {model.activeSerialNumbers.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 font-mono text-[10px] rounded border border-amber-200">
                      {model.activeSerialNumbers.length} Serial No(s)
                    </span>
                  )}
                </div>

                {/* Ledger metrics */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 text-[11px] text-slate-500">
                  <div>
                    Total Inbound: <strong className="text-emerald-700 font-mono">+{model.stockInTotal}</strong>
                  </div>
                  <div className="text-right">
                    Total Dispatched: <strong className="text-amber-700 font-mono">-{model.stockOutTotal}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => setSelectedModelForHistory(model.modelNumber)}
                  className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded inline-flex items-center gap-1 transition"
                  title="View ledger history"
                >
                  <History className="w-3.5 h-3.5" />
                  History
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      onOpenStockInForModel(model.modelNumber, model.hp, model.phase, model.kw)
                    }
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" />
                    In
                  </button>
                  <button
                    onClick={() => onOpenStockOutForModel(model.modelNumber, model.currentBalance)}
                    disabled={model.currentBalance <= 0}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition flex items-center gap-1 ${
                      model.currentBalance > 0
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    <MinusCircle className="w-3 h-3" />
                    Out
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Model History Side Drawer / Modal */}
      {selectedModelForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Model Ledger Audit</span>
                <h2 className="text-base font-mono font-bold">{selectedModelForHistory}</h2>
              </div>
              <button
                onClick={() => setSelectedModelForHistory(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {modelHistoryEntries.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Boxes className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                  <p className="font-semibold text-sm">No transaction movements recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Record a Stock In to add units of this model to active warehouse stock.
                  </p>
                </div>
              ) : (
                modelHistoryEntries.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => {
                      setSelectedModelForHistory(null);
                      onSelectEntry(e);
                    }}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer rounded px-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            e.type === 'Stock In'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {e.type}
                        </span>
                        <span className="font-mono text-xs text-slate-600">{e.date}</span>
                        {e.serialNumber && (
                          <span className="font-mono text-[11px] bg-slate-100 px-1 rounded text-slate-700">
                            SN: {e.serialNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-700 font-medium mt-1">
                        Party: {e.party || '—'} {e.invoiceNumber ? `| Inv: ${e.invoiceNumber}` : ''}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-black text-sm ${
                          e.type === 'Stock In' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {e.type === 'Stock In' ? `+${e.quantity}` : `-${e.quantity}`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedModelForHistory(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
