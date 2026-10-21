import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  FileUp,
} from 'lucide-react';
import { StockEntry } from '../types/inventory';
import { generateCsvData, parseCsvData } from '../utils/stockCalculations';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: StockEntry[];
  onImportEntries: (newEntries: Partial<StockEntry>[]) => Promise<void>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  onImportEntries,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [csvPreview, setCsvPreview] = useState<Partial<StockEntry>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    const csvContent = generateCsvData(entries);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Infinity_Engineering_Stock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const templateRows: StockEntry[] = [
      {
        id: 'sample-1',
        date: new Date().toISOString().split('T')[0],
        type: 'Stock In',
        category: 'Motors / Pumps',
        modelNumber: 'ETN 50-32-200 GG',
        modelName: 'Centrifugal Pump',
        serialNumber: 'IEG-2026-99',
        hp: '7.5',
        phase: '3 PH',
        kw: '5.5',
        quantity: 5,
        party: 'KSB Manufacturing',
        invoiceNumber: 'INV-1002',
        photo: '',
        remarks: 'Sample import entry',
        createdAt: new Date().toISOString(),
      },
    ];
    const csvContent = generateCsvData(templateRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Infinity_Stock_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportSuccess(null);
    setParseErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { entries: parsed, errors } = parseCsvData(text);
      setCsvPreview(parsed);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (csvPreview.length === 0) return;

    try {
      setIsProcessing(true);
      await onImportEntries(csvPreview);
      setImportSuccess(`Successfully imported ${csvPreview.length} inventory movements.`);
      setCsvPreview([]);
    } catch (err: any) {
      setParseErrors([err.message || 'Import failed.']);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Excel / CSV Data Management</h2>
              <p className="text-xs text-slate-300">
                Bulk data exchange with RFC 4180 quotation standard
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileDown className="w-4 h-4" />
            Export Data
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'import'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileUp className="w-4 h-4" />
            Import CSV
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h3 className="text-sm font-bold text-slate-900">Full Warehouse Inventory Export</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Export all <strong className="text-slate-800">{entries.length}</strong> stock ledger records with
                  models, serial numbers, categories, quantities, client parties, and invoice references.
                </p>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button
                    onClick={handleDownloadCsv}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV (Excel Compatible)
                  </button>
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    Download Blank Import Template
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {importSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              {parseErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>CSV Validation Warnings:</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px]">
                    {parseErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upload Box */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50/50 transition">
                <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900">Select or Drag CSV file</h4>
                <p className="text-xs text-slate-500 mt-1">Supports standard CSV with headers.</p>

                <label className="mt-3 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm transition">
                  Browse Computer
                  <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              {/* Parsed Preview */}
              {csvPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      Previewing <strong className="text-blue-700">{csvPreview.length}</strong> rows
                    </span>
                    <button
                      onClick={() => setCsvPreview([])}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs font-mono">
                    {csvPreview.slice(0, 10).map((row, i) => (
                      <div key={i} className="p-2 flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900">{row.modelNumber}</strong>
                          <span className="text-slate-500 ml-2">({row.type})</span>
                        </div>
                        <span className="font-bold text-blue-700">Qty: {row.quantity}</span>
                      </div>
                    ))}
                    {csvPreview.length > 10 && (
                      <div className="p-2 text-center text-slate-400 text-[11px]">
                        + {csvPreview.length - 10} more rows
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    disabled={isProcessing}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isProcessing ? 'Importing records...' : `Import ${csvPreview.length} Entries Now`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
