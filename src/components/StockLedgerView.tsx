import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Trash2,
  FileSpreadsheet,
  Calendar,
  X,
  ChevronDown,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Tag,
  Hash,
  User,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { StockEntry, FilterCriteria, StockMovementType, StockCategory, PhaseType } from '../types/inventory';
import { filterStockEntries, isRecycleBinEntry } from '../utils/stockCalculations';

interface StockLedgerViewProps {
  entries: StockEntry[];
  onSelectEntry: (entry: StockEntry) => void;
  onOpenStockIn: () => void;
  onOpenStockOut: () => void;
  onDeleteEntry: (entry: StockEntry) => void;
  onExportCsv: () => void;
}

export const StockLedgerView: React.FC<StockLedgerViewProps> = ({
  entries,
  onSelectEntry,
  onOpenStockIn,
  onOpenStockOut,
  onDeleteEntry,
  onExportCsv,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'All' | StockMovementType>('All');
  const [selectedCategory, setSelectedCategory] = useState<'All' | StockCategory>('All');
  const [selectedPhase, setSelectedPhase] = useState<'All' | PhaseType>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'qty-desc'>('date-desc');

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedType !== 'All') count++;
    if (selectedCategory !== 'All') count++;
    if (selectedPhase !== 'All') count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [selectedType, selectedCategory, selectedPhase, startDate, endDate]);

  const filteredEntries = useMemo(() => {
    const criteria: FilterCriteria = {
      searchQuery,
      movementType: selectedType,
      category: selectedCategory,
      phase: selectedPhase,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      hideRecycleBin: true,
    };

    let result = filterStockEntries(entries, criteria);

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'qty-desc') {
        return (b.quantity || 0) - (a.quantity || 0);
      }
      if (sortBy === 'date-asc') {
        return (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      // date-desc default
      return (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    return result;
  }, [entries, searchQuery, selectedType, selectedCategory, selectedPhase, startDate, endDate, sortBy]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedType('All');
    setSelectedCategory('All');
    setSelectedPhase('All');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Universal Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Model, Serial No, Party, or Invoice #..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
              title="Export filtered records to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={onOpenStockIn}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition"
            >
              + In
            </button>

            <button
              onClick={onOpenStockOut}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition"
            >
              - Out
            </button>
          </div>
        </div>

        {/* Collapsible Extended Filters Bar */}
        {(showFiltersMobile || activeFiltersCount > 0) && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
            {/* Movement Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Types</option>
                <option value="Stock In">Stock In</option>
                <option value="Stock Out">Stock Out</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Categories</option>
                <option value="Motors / Pumps">Motors / Pumps</option>
                <option value="Spare Parts">Spare Parts</option>
                <option value="Service">Service</option>
              </select>
            </div>

            {/* Phase */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Phase
              </label>
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value as any)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All Phases</option>
                <option value="1 PH">1 Phase (1 PH)</option>
                <option value="3 PH">3 Phase (3 PH)</option>
                <option value="NA">N/A / Spares</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
              />
            </div>

            {/* End Date & Reset */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                To Date
              </label>
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                />
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 font-semibold"
                    title="Clear Filters"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results summary bar & Sort dropdown */}
        <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-900">{filteredEntries.length}</strong> of{' '}
            <span>{entries.filter((e) => !isRecycleBinEntry(e)).length}</span> movements
            {searchQuery && (
              <span>
                {' '}
                for &ldquo;<strong className="text-blue-600">{searchQuery}</strong>&rdquo;
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1 px-2 bg-transparent border border-slate-200 rounded text-xs text-slate-700 font-medium"
            >
              <option value="date-desc">Date (Newest first)</option>
              <option value="date-asc">Date (Oldest first)</option>
              <option value="qty-desc">Quantity (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Ledger Content: Adaptive Hybrid Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden max-w-full">
        {/* DESKTOP TABLE VIEW (Visible on sm and up) */}
        <div className="hidden md:block overflow-x-auto max-w-full">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] sticky top-0">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Model Number & Specs</th>
                <th className="py-3 px-3">Serial No.</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3">Party / Client</th>
                <th className="py-3 px-3">Invoice</th>
                <th className="py-3 px-3 text-center">Attach</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <p className="font-semibold text-sm">No inventory movements match your criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing search or filters to see all stock records.</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    className="hover:bg-blue-50/40 cursor-pointer transition"
                  >
                    {/* Date */}
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {entry.date || '—'}
                    </td>

                    {/* Type */}
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

                    {/* Model & Specs */}
                    <td className="py-3 px-3 max-w-[260px]">
                      <div className="font-mono font-bold text-slate-900 truncate">
                        {entry.modelNumber || entry.modelName || '—'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                        <span className="px-1 py-0.2 bg-slate-100 rounded text-[10px] font-semibold text-slate-600">
                          {entry.category}
                        </span>
                        {entry.hp && (
                          <span className="px-1 py-0.2 bg-blue-50 text-blue-700 rounded text-[10px] font-mono">
                            {entry.hp} HP
                          </span>
                        )}
                        {entry.phase && entry.phase !== 'NA' && (
                          <span className="px-1 py-0.2 bg-indigo-50 text-indigo-700 rounded text-[10px] font-mono">
                            {entry.phase}
                          </span>
                        )}
                        {entry.kw && (
                          <span className="text-slate-400 font-mono text-[10px]">
                            {entry.kw} kW
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Serial Number */}
                    <td className="py-3 px-3 font-mono whitespace-nowrap">
                      {entry.serialNumber ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[11px] border border-slate-200">
                          {entry.serialNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 text-center font-bold text-sm">
                      <span
                        className={
                          entry.type === 'Stock In' ? 'text-emerald-700' : 'text-amber-700'
                        }
                      >
                        {entry.type === 'Stock In' ? `+${entry.quantity}` : `-${entry.quantity}`}
                      </span>
                    </td>

                    {/* Party */}
                    <td className="py-3 px-3 text-slate-700 truncate max-w-[170px]" title={entry.party}>
                      {entry.party || '—'}
                    </td>

                    {/* Invoice */}
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {entry.invoiceNumber || '—'}
                    </td>

                    {/* Attachment thumbnail indicator */}
                    <td className="py-3 px-3 text-center">
                      {entry.photo ? (
                        <a
                          href={entry.photo}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="View Attachment"
                          className="inline-flex p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        >
                          <Paperclip className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEntry(entry);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
                          title="View Details"
                          aria-label={`View entry ${entry.modelNumber}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEntry(entry);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Move to Recycle Bin"
                          aria-label={`Delete entry ${entry.modelNumber}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE ADAPTIVE CARD VIEW (Visible on mobile screens < md) - ZERO CLIPPING! */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredEntries.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-500">
              <p className="font-semibold text-sm">No inventory movements found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting search or filters.</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="p-3.5 hover:bg-slate-50/80 active:bg-slate-100 transition flex flex-col gap-2.5 cursor-pointer"
              >
                {/* Top Row: Type, Date, Quantity Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
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
                    <span className="text-[11px] font-mono text-slate-500">{entry.date}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`font-black text-base px-2 py-0.5 rounded ${
                        entry.type === 'Stock In'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {entry.type === 'Stock In' ? `+${entry.quantity}` : `-${entry.quantity}`}
                    </span>
                  </div>
                </div>

                {/* Main: Model & Specs */}
                <div>
                  <h3 className="font-mono font-bold text-sm text-slate-900 leading-tight">
                    {entry.modelNumber || entry.modelName || 'Stock Item'}
                  </h3>
                  {entry.modelName && entry.modelNumber && (
                    <p className="text-xs text-slate-500 mt-0.5">{entry.modelName}</p>
                  )}
                </div>

                {/* Specs chips row */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                    {entry.category}
                  </span>
                  {entry.hp && (
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono font-semibold">
                      {entry.hp} HP
                    </span>
                  )}
                  {entry.phase && entry.phase !== 'NA' && (
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono">
                      {entry.phase}
                    </span>
                  )}
                  {entry.serialNumber && (
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-mono font-semibold">
                      SN: {entry.serialNumber}
                    </span>
                  )}
                </div>

                {/* Footer: Party & Invoice + Action buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-600">
                  <div className="min-w-0 pr-2">
                    {entry.party && (
                      <div className="truncate font-medium text-slate-800">{entry.party}</div>
                    )}
                    {entry.invoiceNumber && (
                      <div className="text-[11px] font-mono text-slate-400">
                        Inv: {entry.invoiceNumber}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {entry.photo && (
                      <a
                        href={entry.photo}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Attachment"
                      >
                        <Paperclip className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEntry(entry);
                      }}
                      className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded"
                    >
                      Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEntry(entry);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
