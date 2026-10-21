import React from 'react';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  AlertTriangle,
  Wrench,
  Cog,
  PlusCircle,
  MinusCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { StockEntry, ModelSummary } from '../types/inventory';
import { calculateStockBalance, getLowStockItems } from '../utils/stockCalculations';

interface DashboardViewProps {
  entries: StockEntry[];
  onOpenStockIn: () => void;
  onOpenStockOut: (prefillModel?: string) => void;
  onSelectEntry: (entry: StockEntry) => void;
  onNavigateToLedger: () => void;
  onNavigateToCatalog: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  entries,
  onOpenStockIn,
  onOpenStockOut,
  onSelectEntry,
  onNavigateToLedger,
  onNavigateToCatalog,
}) => {
  const stats = calculateStockBalance(entries);
  const lowStockItems = getLowStockItems(entries, 2);

  // Category counts
  const categorySummary = entries.reduce(
    (acc, e) => {
      if (String(e.remarks || '').includes('[RECYCLE_BIN]')) return acc;
      const cat = e.category || 'Motors / Pumps';
      if (!acc[cat]) {
        acc[cat] = { in: 0, out: 0, balance: 0 };
      }
      const qty = Math.max(0, Number(e.quantity) || 0);
      if (e.type === 'Stock In') {
        acc[cat].in += qty;
        acc[cat].balance += qty;
      } else {
        acc[cat].out += qty;
        acc[cat].balance -= qty;
      }
      return acc;
    },
    {
      'Motors / Pumps': { in: 0, out: 0, balance: 0 },
      'Spare Parts': { in: 0, out: 0, balance: 0 },
      'Service': { in: 0, out: 0, balance: 0 },
    } as Record<string, { in: number; out: number; balance: number }>
  );

  // Recent 6 transactions
  const recentEntries = [...entries]
    .filter((e) => !String(e.remarks || '').includes('[RECYCLE_BIN]'))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Warehouse Operations Center</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
              System Active
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Real-time tracking of motors, pumps, spares & maintenance dispatches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenStockIn}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm shadow transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            New Stock In
          </button>
          <button
            onClick={() => onOpenStockOut()}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-sm shadow transition active:scale-95"
          >
            <MinusCircle className="w-4 h-4" />
            New Stock Out
          </button>
        </div>
      </div>

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Balance */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group hover:border-blue-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Inventory Balance</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {stats.currentBalance}
            </span>
            <span className="text-xs font-semibold text-slate-500">Units Available</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 flex items-center gap-1">
            <span className="font-semibold text-blue-600">{stats.uniqueModelsCount}</span> active pump/motor models
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
        </div>

        {/* Total Stock In */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Stock In</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              +{stats.totalIn}
            </span>
            <span className="text-xs font-semibold text-slate-500">Units Received</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 flex items-center gap-1">
            Cumulative receipts & factory deliveries
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Total Stock Out */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group hover:border-amber-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Stock Out</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-700 tracking-tight">
              -{stats.totalOut}
            </span>
            <span className="text-xs font-semibold text-slate-500">Units Dispatched</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 flex items-center gap-1">
            Client shipments, site deliveries & jobs
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        {/* Total Entries Count */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs relative overflow-hidden group hover:border-indigo-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Stock Entries</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {stats.totalEntries}
            </span>
            <span className="text-xs font-semibold text-slate-500">Ledger Records</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 flex items-center gap-1">
            Audited movements across all categories
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
        </div>
      </div>

      {/* Low Stock Alerts & Category Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alert Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Low Stock Warnings (Critical Threshold &le; 2)</h2>
                <p className="text-xs text-slate-500">Models requiring immediate factory order or restock</p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
              {lowStockItems.length} Models
            </span>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No low stock warnings. All registered items meet minimum stock thresholds.
              </div>
            ) : (
              lowStockItems.slice(0, 5).map((item) => (
                <div key={item.modelNumber} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 truncate">
                        {item.modelNumber}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600">
                        {item.category}
                      </span>
                      {item.hp && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-50 text-blue-700 rounded">
                          {item.hp} HP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      In: {item.stockInTotal} | Out: {item.stockOutTotal}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        item.currentBalance <= 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.currentBalance} left
                    </span>
                    <button
                      onClick={onOpenStockIn}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                    >
                      + Restock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {lowStockItems.length > 5 && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={onNavigateToCatalog}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                View all in Products Catalog <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
                <Cog className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Inventory by Category</h2>
                <p className="text-xs text-slate-500">Current available balance by domain</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Motors / Pumps */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Motors & Industrial Pumps</span>
                  <span className="font-bold text-blue-700">{categorySummary['Motors / Pumps']?.balance ?? 0} Units</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        stats.currentBalance > 0
                          ? ((categorySummary['Motors / Pumps']?.balance ?? 0) / stats.currentBalance) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Recv: {categorySummary['Motors / Pumps']?.in ?? 0}</span>
                  <span>Disp: {categorySummary['Motors / Pumps']?.out ?? 0}</span>
                </div>
              </div>

              {/* Spare Parts */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Spare Parts & Components</span>
                  <span className="font-bold text-indigo-700">{categorySummary['Spare Parts']?.balance ?? 0} Units</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        stats.currentBalance > 0
                          ? ((categorySummary['Spare Parts']?.balance ?? 0) / stats.currentBalance) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Recv: {categorySummary['Spare Parts']?.in ?? 0}</span>
                  <span>Disp: {categorySummary['Spare Parts']?.out ?? 0}</span>
                </div>
              </div>

              {/* Service */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Service & Overhaul Jobs</span>
                  <span className="font-bold text-amber-700">{categorySummary['Service']?.balance ?? 0} Units</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        stats.currentBalance > 0
                          ? ((categorySummary['Service']?.balance ?? 0) / stats.currentBalance) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Recv: {categorySummary['Service']?.in ?? 0}</span>
                  <span>Disp: {categorySummary['Service']?.out ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={onNavigateToLedger}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition flex items-center justify-center gap-1.5"
            >
              Open Full Stock Ledger <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Movements Section */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Movements & Dispatches</h2>
              <p className="text-xs text-slate-500">Latest recorded inbound and outbound transactions</p>
            </div>
          </div>

          <button
            onClick={onNavigateToLedger}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            View All Ledger <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile-friendly table / list */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Model / Description</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Serial No.</th>
                <th className="py-2.5 px-3">Qty</th>
                <th className="py-2.5 px-3 hidden md:table-cell">Party / Destination</th>
                <th className="py-2.5 px-3 hidden lg:table-cell">Invoice</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentEntries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  className="hover:bg-slate-50 cursor-pointer transition"
                >
                  <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {entry.date || '—'}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                        entry.type === 'Stock In'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {entry.type === 'Stock In' ? (
                        <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-amber-600" />
                      )}
                      {entry.type}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 font-mono">
                      {entry.modelNumber || entry.modelName || '—'}
                    </div>
                    {entry.modelName && entry.modelNumber && (
                      <div className="text-[11px] text-slate-500">{entry.modelName}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 hidden sm:table-cell font-mono text-slate-600">
                    {entry.serialNumber ? (
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px]">
                        {entry.serialNumber}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    <span
                      className={
                        entry.type === 'Stock In' ? 'text-emerald-700' : 'text-amber-700'
                      }
                    >
                      {entry.type === 'Stock In' ? `+${entry.quantity}` : `-${entry.quantity}`}
                    </span>
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell text-slate-600 truncate max-w-[160px]">
                    {entry.party || '—'}
                  </td>
                  <td className="py-3 px-3 hidden lg:table-cell font-mono text-slate-500">
                    {entry.invoiceNumber || '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEntry(entry);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1 font-semibold text-xs inline-flex items-center gap-0.5"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
