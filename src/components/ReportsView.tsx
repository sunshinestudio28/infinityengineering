import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Building2,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
} from 'lucide-react';
import { StockEntry } from '../types/inventory';
import { calculateStockBalance, isRecycleBinEntry } from '../utils/stockCalculations';

interface ReportsViewProps {
  entries: StockEntry[];
  onExportCsv: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ entries, onExportCsv }) => {
  const activeEntries = useMemo(() => entries.filter((e) => !isRecycleBinEntry(e)), [entries]);
  const stats = calculateStockBalance(entries);

  // Group by Party
  const partyVolume = useMemo(() => {
    const map = new Map<string, { party: string; inboundQty: number; outboundQty: number; count: number }>();
    for (const e of activeEntries) {
      const name = (e.party || 'Unspecified Party').trim();
      let record = map.get(name);
      if (!record) {
        record = { party: name, inboundQty: 0, outboundQty: 0, count: 0 };
        map.set(name, record);
      }
      record.count++;
      const qty = Math.max(0, Number(e.quantity) || 0);
      if (e.type === 'Stock In') {
        record.inboundQty += qty;
      } else {
        record.outboundQty += qty;
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.inboundQty + b.outboundQty - (a.inboundQty + a.outboundQty))
      .slice(0, 8);
  }, [activeEntries]);

  // Group by Model top moved
  const topModels = useMemo(() => {
    const map = new Map<string, { model: string; inQty: number; outQty: number; balance: number }>();
    for (const e of activeEntries) {
      const model = (e.modelNumber || e.modelName || 'Unknown').trim();
      let record = map.get(model);
      if (!record) {
        record = { model, inQty: 0, outQty: 0, balance: 0 };
        map.set(model, record);
      }
      const qty = Math.max(0, Number(e.quantity) || 0);
      if (e.type === 'Stock In') {
        record.inQty += qty;
        record.balance += qty;
      } else {
        record.outQty += qty;
        record.balance -= qty;
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.inQty + b.outQty - (a.inQty + a.outQty))
      .slice(0, 8);
  }, [activeEntries]);

  // Monthly breakdown
  const monthlyFlow = useMemo(() => {
    const map = new Map<string, { month: string; inQty: number; outQty: number }>();
    for (const e of activeEntries) {
      const month = e.date ? e.date.slice(0, 7) : 'Unknown';
      let record = map.get(month);
      if (!record) {
        record = { month, inQty: 0, outQty: 0 };
        map.set(month, record);
      }
      const qty = Math.max(0, Number(e.quantity) || 0);
      if (e.type === 'Stock In') record.inQty += qty;
      else record.outQty += qty;
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [activeEntries]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventory Movement & Audit Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Official warehouse turnover analysis for Infinity Engineering Group.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print Report
          </button>
          <button
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Full CSV
          </button>
        </div>
      </div>

      {/* Top 3 High Level Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Inbound Volume</span>
          <div className="mt-2 text-2xl font-black text-emerald-700">+{stats.totalIn} Units</div>
          <p className="text-xs text-slate-500 mt-1">Across all registered factory receipts</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Outbound Volume</span>
          <div className="mt-2 text-2xl font-black text-amber-700">-{stats.totalOut} Units</div>
          <p className="text-xs text-slate-500 mt-1">Total client & project dispatches</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stock Turnover Ratio</span>
          <div className="mt-2 text-2xl font-black text-blue-700">
            {stats.totalIn > 0 ? ((stats.totalOut / stats.totalIn) * 100).toFixed(1) : 0}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Dispatches compared to total inbound stock</p>
        </div>
      </div>

      {/* Two columns: Top Parties & Top Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Parties */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Top Parties & Client Accounts</h2>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {partyVolume.map((item, idx) => (
              <div key={item.party} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-slate-800 truncate">
                    {idx + 1}. {item.party}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {item.count} transaction{item.count > 1 ? 's' : ''}
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono flex-shrink-0">
                  <span className="text-emerald-700">+{item.inboundQty}</span>
                  <span className="text-amber-700">-{item.outboundQty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Models */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Package className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Highest Volume Pump & Motor Models</h2>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {topModels.map((item, idx) => (
              <div key={item.model} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-mono font-bold text-slate-900 truncate">
                    {idx + 1}. {item.model}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Current Balance: <strong className="text-slate-800">{item.balance}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono flex-shrink-0">
                  <span className="text-emerald-700 font-semibold">+{item.inQty}</span>
                  <span className="text-amber-700 font-semibold">-{item.outQty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Timeline Breakdown */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Layers className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Monthly Stock Activity Summary</h2>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[11px]">
                <th className="py-2 px-3">Period</th>
                <th className="py-2 px-3">Stock In (Units)</th>
                <th className="py-2 px-3">Stock Out (Units)</th>
                <th className="py-2 px-3">Net Monthly Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyFlow.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{row.month}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">+{row.inQty}</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700 font-semibold">-{row.outQty}</td>
                  <td className="py-2.5 px-3 font-mono font-bold">
                    <span className={row.inQty - row.outQty >= 0 ? 'text-blue-700' : 'text-rose-700'}>
                      {row.inQty - row.outQty >= 0 ? `+${row.inQty - row.outQty}` : `${row.inQty - row.outQty}`}
                    </span>
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
