import React from 'react';
import {
  X,
  Printer,
  Edit,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Paperclip,
  CheckCircle2,
  Building2,
  Calendar,
  Hash,
  Zap,
} from 'lucide-react';
import { StockEntry } from '../types/inventory';

interface EntryDetailModalProps {
  entry: StockEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (entry: StockEntry) => void;
  onDelete: (entry: StockEntry) => void;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  entry,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !entry) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`p-1.5 rounded-md ${
                entry.type === 'Stock In' ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              {entry.type === 'Stock In' ? (
                <ArrowDownLeft className="w-4 h-4 text-white" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-white" />
              )}
            </span>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-blue-300">
                Movement Voucher #{entry.id.slice(0, 10)}
              </span>
              <h2 className="text-base font-bold text-white">Stock Movement Detail</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Printable Voucher) */}
        <div className="p-5 sm:p-6 space-y-5 print:p-0">
          {/* Top Banner with Model & Quantity */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {entry.category}
              </span>
              <h3 className="font-mono font-black text-lg text-slate-900">
                {entry.modelNumber || entry.modelName}
              </h3>
              {entry.modelName && (
                <p className="text-xs text-slate-600">{entry.modelName}</p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Quantity
              </span>
              <span
                className={`text-2xl font-black ${
                  entry.type === 'Stock In' ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {entry.type === 'Stock In' ? `+${entry.quantity}` : `-${entry.quantity}`}
              </span>
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">HP</span>
              <span className="font-mono font-bold text-sm text-slate-900">
                {entry.hp ? `${entry.hp} HP` : '—'}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Phase</span>
              <span className="font-mono font-bold text-sm text-slate-900">
                {entry.phase || '—'}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Power (kW)</span>
              <span className="font-mono font-bold text-sm text-slate-900">
                {entry.kw ? `${entry.kw} kW` : '—'}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Date</span>
              <span className="font-mono font-bold text-sm text-slate-900">
                {entry.date || '—'}
              </span>
            </div>
          </div>

          {/* Serial Number & Verification */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              Assigned Serial Number
            </span>
            <div className="font-mono font-bold text-base text-slate-900">
              {entry.serialNumber ? (
                <span className="px-2 py-0.5 bg-white border border-slate-300 rounded">
                  {entry.serialNumber}
                </span>
              ) : (
                <span className="text-slate-400 font-normal text-xs">No unique serial recorded (bulk or spare)</span>
              )}
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
            <div className="p-3 flex justify-between">
              <span className="text-slate-500 font-medium">
                {entry.type === 'Stock In' ? 'Supplier / Manufacturer' : 'Client / Destination'}
              </span>
              <strong className="text-slate-900 font-semibold">{entry.party || '—'}</strong>
            </div>

            <div className="p-3 flex justify-between">
              <span className="text-slate-500 font-medium">Invoice / Gate Pass</span>
              <span className="font-mono font-bold text-slate-900">{entry.invoiceNumber || '—'}</span>
            </div>

            <div className="p-3 flex justify-between">
              <span className="text-slate-500 font-medium">System Record ID</span>
              <span className="font-mono text-slate-400 text-[11px] truncate max-w-[200px]" title={entry.id}>
                {entry.id}
              </span>
            </div>

            {entry.remarks && (
              <div className="p-3">
                <span className="text-slate-500 font-medium block mb-1">Remarks & Notes</span>
                <p className="text-slate-800 bg-slate-50 p-2 rounded text-xs leading-relaxed">
                  {entry.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Attachment Photo / Receipt */}
          {entry.photo && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Attached Document
              </span>
              <div className="flex items-center gap-3">
                <img
                  src={entry.photo}
                  alt="Attachment"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-300"
                />
                <div>
                  <a
                    href={entry.photo}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 font-semibold hover:underline block"
                  >
                    Open Full Image / Document
                  </a>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Uploaded to Cloudinary CDN
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onClose();
              onDelete(entry);
            }}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Recycle Bin</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              Print Voucher
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(entry);
              }}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
