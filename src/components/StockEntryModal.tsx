import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Upload,
  AlertTriangle,
  CheckCircle,
  FileText,
  Search,
  Sparkles,
  Paperclip,
  Trash2,
  ScanLine,
  Camera,
} from 'lucide-react';
import { StockEntry, StockMovementType, StockCategory, PhaseType } from '../types/inventory';
import { KNOWN_MODELS } from '../data/knownModels';
import {
  calculateModelBalances,
  detectDuplicateSerial,
  validateStockOut,
  normalizePhase,
  normalizeCategory,
} from '../utils/stockCalculations';
import { uploadAttachment } from '../services/firebaseConfig';
import { QrScannerModal } from './QrScannerModal';

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<StockEntry, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  existingEntries: StockEntry[];
  initialType?: StockMovementType;
  initialModelNumber?: string;
  initialEntry?: StockEntry | null;
}

export const StockEntryModal: React.FC<StockEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingEntries,
  initialType = 'Stock In',
  initialModelNumber = '',
  initialEntry = null,
}) => {
  const [type, setType] = useState<StockMovementType>(initialType);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<StockCategory>('Motors / Pumps');
  const [modelNumber, setModelNumber] = useState(initialModelNumber);
  const [modelName, setModelName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [hp, setHp] = useState('');
  const [phase, setPhase] = useState<PhaseType>('3 PH');
  const [kw, setKw] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [party, setParty] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Model search dropdown & QR scanner
  const [modelSearch, setModelSearch] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleApplyScannedModel = (scannedModel: string, scannedSerial?: string) => {
    handleSelectModel(scannedModel);
    if (scannedSerial) {
      setSerialNumber(scannedSerial);
    }
  };

  const handleApplyScannedSerial = (scannedSerial: string, matchedModelNum?: string) => {
    setSerialNumber(scannedSerial);
    if (matchedModelNum) {
      handleSelectModel(matchedModelNum);
    }
  };

  // Populate if editing or prefilled
  useEffect(() => {
    if (initialEntry) {
      setType(initialEntry.type);
      setDate(initialEntry.date || new Date().toISOString().split('T')[0]);
      setCategory(initialEntry.category);
      setModelNumber(initialEntry.modelNumber);
      setModelName(initialEntry.modelName || '');
      setSerialNumber(initialEntry.serialNumber || '');
      setHp(initialEntry.hp || '');
      setPhase(initialEntry.phase || '3 PH');
      setKw(initialEntry.kw || '');
      setQuantity(initialEntry.quantity || 1);
      setParty(initialEntry.party || '');
      setInvoiceNumber(initialEntry.invoiceNumber || '');
      setRemarks(initialEntry.remarks || '');
      setPhotoUrl(initialEntry.photo || '');
    } else {
      setType(initialType);
      if (initialModelNumber) {
        handleSelectModel(initialModelNumber);
      }
    }
  }, [initialEntry, initialType, initialModelNumber]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter model suggestions
  const modelSuggestions = useMemo(() => {
    const q = (modelSearch || modelNumber).trim().toLowerCase();
    if (!q) return KNOWN_MODELS.slice(0, 15);
    return KNOWN_MODELS.filter((m) => m.modelNumber.toLowerCase().includes(q)).slice(0, 20);
  }, [modelSearch, modelNumber]);

  // Active balances for current model
  const modelBalances = useMemo(() => {
    return calculateModelBalances(existingEntries);
  }, [existingEntries]);

  const currentModelBalance = useMemo(() => {
    if (!modelNumber) return 0;
    const found = modelBalances.find((m) => m.modelNumber.toUpperCase() === modelNumber.trim().toUpperCase());
    return found ? found.currentBalance : 0;
  }, [modelBalances, modelNumber]);

  const activeSerialsForModel = useMemo(() => {
    if (!modelNumber) return [];
    const found = modelBalances.find((m) => m.modelNumber.toUpperCase() === modelNumber.trim().toUpperCase());
    return found ? found.activeSerialNumbers : [];
  }, [modelBalances, modelNumber]);

  // Validation warnings
  const serialWarning = useMemo(() => {
    if (type !== 'Stock In' || !serialNumber.trim()) return null;
    const check = detectDuplicateSerial(existingEntries, serialNumber, initialEntry?.id);
    if (check.isDuplicate) {
      return `Warning: Serial Number '${serialNumber}' is already recorded in active stock.`;
    }
    return null;
  }, [type, serialNumber, existingEntries, initialEntry]);

  const stockOutValidation = useMemo(() => {
    if (type !== 'Stock Out') return { valid: true, currentBalance: 0, error: undefined };
    return validateStockOut(existingEntries, modelNumber, quantity);
  }, [type, modelNumber, quantity, existingEntries]);

  const handleSelectModel = (chosenModelNum: string) => {
    setModelNumber(chosenModelNum);
    setShowModelDropdown(false);

    // 1. Auto-fill specs from existing entries if previously recorded
    const matchFromEntries = existingEntries.find(
      (e) => (e.modelNumber || '').toUpperCase() === chosenModelNum.trim().toUpperCase() && (e.hp || e.modelName)
    );
    if (matchFromEntries) {
      if (matchFromEntries.hp) setHp(matchFromEntries.hp);
      if (matchFromEntries.phase) setPhase(matchFromEntries.phase);
      if (matchFromEntries.kw) setKw(matchFromEntries.kw);
      if (matchFromEntries.category) setCategory(matchFromEntries.category);
      if (matchFromEntries.modelName) setModelName(matchFromEntries.modelName);
    }

    // 2. Auto-fill specs from KNOWN_MODELS catalog if not yet set
    const match = KNOWN_MODELS.find(
      (m) => m.modelNumber.toUpperCase() === chosenModelNum.trim().toUpperCase()
    );
    if (match) {
      if (match.hp && !hp) setHp(match.hp);
      if (match.phase && (!phase || phase === 'NA')) setPhase(match.phase);
      if (match.kw && !kw) setKw(match.kw);
      if (match.category) setCategory(match.category);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setError(null);
      const url = await uploadAttachment(file);
      setPhotoUrl(url);
    } catch (err: any) {
      console.warn('Cloudinary upload error, using local data URL fallback:', err);
      // Local fallback for offline/development environments
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!modelNumber.trim()) {
      setError('Please select or specify a model number.');
      return;
    }

    if (quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    if (type === 'Stock Out' && !stockOutValidation.valid) {
      setError(stockOutValidation.error || 'Insufficient stock for this model.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        ...(initialEntry?.id ? { id: initialEntry.id } : {}),
        date,
        type,
        category,
        modelNumber: modelNumber.trim(),
        modelName: modelName.trim(),
        serialNumber: serialNumber.trim(),
        hp: hp.trim(),
        phase,
        kw: kw.trim(),
        quantity: Number(quantity),
        party: party.trim(),
        invoiceNumber: invoiceNumber.trim(),
        photo: photoUrl,
        remarks: remarks.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record stock movement.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 text-white flex items-center justify-between ${
            type === 'Stock In' ? 'bg-slate-900' : 'bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                type === 'Stock In' ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              {type === 'Stock In' ? (
                <ArrowDownLeft className="w-5 h-5 text-white" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {initialEntry ? 'Edit Stock Movement' : type === 'Stock In' ? 'Record Stock In (Receipt)' : 'Record Stock Out (Dispatch)'}
              </h2>
              <p className="text-xs text-slate-300">
                Infinity Engineering Group Inventory Control
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Movement Type Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Movement Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('Stock In')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                    type === 'Stock In'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Stock In
                </button>
                <button
                  type="button"
                  onClick={() => setType('Stock Out')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                    type === 'Stock Out'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Stock Out
                </button>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Transaction Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Motors / Pumps', 'Spare Parts', 'Service'] as StockCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition ${
                    category === cat
                      ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold'
                      : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Model Number Autocomplete & QR Code Scanner */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Model Number *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQrScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition active:scale-95 shadow-2xs"
                  title="Scan QR code or 1D barcode using camera to auto-fill fields"
                >
                  <ScanLine className="w-3.5 h-3.5 text-blue-600" />
                  <span>Scan QR / Barcode</span>
                </button>
                {modelNumber && (
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Balance: <strong className="text-blue-700">{currentModelBalance} units</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                required
                placeholder="Type, select or scan QR / barcode (e.g. CUTE PLUS I, ETN 50-32-200 GG)..."
                value={modelNumber}
                onChange={(e) => {
                  setModelNumber(e.target.value);
                  setModelSearch(e.target.value);
                  setShowModelDropdown(true);
                }}
                onFocus={() => setShowModelDropdown(true)}
                className="w-full py-2 pl-3 pr-10 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setIsQrScannerOpen(true)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                title="Scan QR code with camera"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown list */}
            {showModelDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-100">
                {modelSuggestions.map((m) => (
                  <button
                    key={m.modelNumber}
                    type="button"
                    onClick={() => handleSelectModel(m.modelNumber)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between transition"
                  >
                    <span className="font-mono font-bold text-slate-900">{m.modelNumber}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {m.hp ? `${m.hp} HP` : ''} {m.phase !== 'NA' ? `• ${m.phase}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Model Name / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Model Description / Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Centrifugal Volute Pump, End Suction..."
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Specifications Row: HP, Phase, KW */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                HP (Horsepower)
              </label>
              <input
                type="text"
                placeholder="e.g. 7.5, 10"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Phase
              </label>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as PhaseType)}
                className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                <option value="3 PH">3 Phase (3 PH)</option>
                <option value="1 PH">1 Phase (1 PH)</option>
                <option value="NA">N/A / Spares</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                kW (Power)
              </label>
              <input
                type="text"
                placeholder="e.g. 5.5"
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Serial Number & Quantity Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Serial Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Serial Number
                </label>
                {type === 'Stock Out' && activeSerialsForModel.length > 0 && (
                  <span className="text-[10px] text-blue-600 font-medium">
                    {activeSerialsForModel.length} in stock
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="e.g. IEG-2026-081"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />

              {/* Quick serial suggestion chips on Stock Out */}
              {type === 'Stock Out' && activeSerialsForModel.length > 0 && !serialNumber && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {activeSerialsForModel.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSerialNumber(s)}
                      className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-700 rounded font-mono border border-slate-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {serialWarning && (
                <p className="mt-1 text-[11px] text-amber-600 font-semibold">{serialWarning}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Quantity *
                </label>
                {type === 'Stock Out' && (
                  <span
                    className={`text-[11px] font-bold ${
                      currentModelBalance < quantity ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    Max: {currentModelBalance}
                  </span>
                )}
              </div>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              {type === 'Stock Out' && currentModelBalance < quantity && (
                <p className="mt-1 text-[11px] text-rose-600 font-semibold">
                  Cannot dispatch more than current balance ({currentModelBalance}).
                </p>
              )}
            </div>
          </div>

          {/* Party & Invoice Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {type === 'Stock In' ? 'Supplier / Manufacturer' : 'Client / Destination Party'} *
              </label>
              <input
                type="text"
                required
                placeholder={type === 'Stock In' ? 'e.g. KSB Pumps, Local Vendor...' : 'e.g. Royal Sugar Mills, Falcon Corp...'}
                value={party}
                onChange={(e) => setParty(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Invoice / Gate Pass #
              </label>
              <input
                type="text"
                placeholder="e.g. INV-9021, GP-441"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Attachment (Cloudinary / File upload) */}
          <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Photo or Delivery Receipt (PDF / Image)
              </span>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            {photoUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={photoUrl}
                  alt="Attachment preview"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-300"
                />
                <div className="text-xs text-slate-600 truncate flex-1">
                  <span className="font-semibold text-emerald-700 block">File Attached</span>
                  <a
                    href={photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline truncate block text-[11px]"
                  >
                    View uploaded document
                  </a>
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>{uploadingPhoto ? 'Uploading file...' : 'Upload Image / Delivery Note'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
              </label>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Remarks & Technical Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Hydro-test passed, impeller trimmed, delivery to site gate 2..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (type === 'Stock Out' && !stockOutValidation.valid)}
              className={`px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-lg shadow-sm transition flex items-center gap-2 ${
                type === 'Stock In'
                  ? 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50'
                  : 'bg-amber-600 hover:bg-amber-500 disabled:opacity-50'
              }`}
            >
              {isSaving ? (
                <>Saving Record...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {initialEntry ? 'Save Changes' : type === 'Stock In' ? 'Confirm Stock In' : 'Confirm Stock Out'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Camera QR Code & 1D Barcode Scanner Modal */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        existingEntries={existingEntries}
        onApplyModel={handleApplyScannedModel}
        onApplySerial={handleApplyScannedSerial}
        currentType={type}
      />
    </div>
  );
};
