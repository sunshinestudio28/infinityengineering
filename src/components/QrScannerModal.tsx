import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Camera,
  ScanLine,
  Barcode,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  SwitchCamera,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { StockEntry } from '../types/inventory';
import { KNOWN_MODELS } from '../data/knownModels';
import {
  classifyScannedCode,
  ScannedCodeAnalysis,
} from '../utils/barcodeClassifier';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingEntries: StockEntry[];
  onApplyModel: (modelNumber: string, serialNumber?: string) => void;
  onApplySerial: (serialNumber: string, matchedModelNumber?: string) => void;
  currentType?: 'Stock In' | 'Stock Out';
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  existingEntries,
  onApplyModel,
  onApplySerial,
  currentType = 'Stock In',
}) => {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [detectedAnalysis, setDetectedAnalysis] = useState<ScannedCodeAnalysis | null>(null);
  const [manualOverrideValue, setManualOverrideValue] = useState('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-barcode-reader-container';

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (err) {
      console.warn('Error stopping camera scanner:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanSuccess = async (decodedText: string, formatName?: string) => {
    // 8. Stop camera immediately after scan
    await stopScanner();

    // 2-6. Classify and analyze scanned code
    const analysis = classifyScannedCode(decodedText, existingEntries, KNOWN_MODELS);
    setDetectedAnalysis(analysis);
    setManualOverrideValue(decodedText);
  };

  const startScanner = async (cameraId?: string) => {
    setError(null);
    setDetectedAnalysis(null);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });
      }

      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      // Responsive scanning box optimized for both wide 1D barcodes and 2D QR codes
      const config = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(viewfinderWidth * 0.85, 340);
          const height = Math.min(viewfinderHeight * 0.65, 200);
          return { width: Math.round(width), height: Math.round(height) };
        },
        aspectRatio: 1.33,
      };

      const cameraParam = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        cameraParam,
        config,
        (decodedText, result) => {
          const formatName = result?.result?.format?.formatName || 'BARCODE';
          handleScanSuccess(decodedText, formatName);
        },
        () => {
          // Frame scanner loop
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setIsScanning(false);
      setError(
        err?.message ||
          'Camera access not available or blocked. Please enable camera permissions or upload an image below.'
      );
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const list = devices.map((d) => ({
            id: d.id,
            label: d.label || `Camera ${d.id.slice(0, 5)}`,
          }));
          setCameras(list);
          const backCam = list.find((c) => /back|rear|environment/i.test(c.label)) || list[0];
          setSelectedCameraId(backCam.id);
          startScanner(backCam.id);
        } else {
          startScanner();
        }
      })
      .catch((err) => {
        console.warn('Camera enumeration note:', err);
        startScanner();
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const handleCameraChange = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    await stopScanner();
    await startScanner(newCamId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }
      const result = await html5QrCodeRef.current.scanFile(file, true);
      handleScanSuccess(result, 'IMAGE_UPLOAD');
    } catch (err: any) {
      setError('Could not detect a QR code or 1D barcode in this image. Please ensure the label is clear and well lit.');
    }
  };

  const handleRestartScan = () => {
    setDetectedAnalysis(null);
    startScanner(selectedCameraId);
  };

  const handleApplyModelAction = (modelNum: string, serialNum?: string) => {
    stopScanner();
    onApplyModel(modelNum, serialNum);
    onClose();
  };

  const handleApplySerialAction = (serialNum: string, matchedModelNum?: string) => {
    stopScanner();
    onApplySerial(serialNum, matchedModelNum);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">QR & 1D Barcode Scanner</h2>
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded uppercase">
                  1D / 2D
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Pumps, motors, rating plates & serial barcodes
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            aria-label="Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* CAMERA VIEWFINDER (Active when scanning and no result sheet yet) */}
          {!detectedAnalysis && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center shadow-inner">
                {/* Mount container */}
                <div id={scannerContainerId} className="w-full h-full object-cover" />

                {/* Industrial Viewfinder Reticle for 1D Barcodes and 2D QR */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[85%] h-[60%] border-2 border-blue-400/90 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                      {/* Corner Marks */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl-md" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr-md" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl-md" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br-md" />

                      {/* Wide Scanning Laser Line */}
                      <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee] animate-pulse top-1/2 -translate-y-1/2" />

                      <div className="absolute -bottom-7 left-0 right-0 text-center">
                        <span className="text-[11px] font-semibold text-slate-200 bg-slate-900/80 px-2 py-0.5 rounded shadow">
                          Align QR code or 1D barcode inside box
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading Stream */}
                {!isScanning && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-xs font-medium text-slate-200">
                      Starting camera scanner...
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Switcher */}
              {cameras.length > 1 && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <SwitchCamera className="w-3.5 h-3.5" />
                    Camera Device:
                  </span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 font-semibold"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Camera Error Alert */}
              {error && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {/* Upload image / photo fallback */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <label className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Scan from Photo / Image File</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={() => startScanner(selectedCameraId)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                  title="Reload Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Quick simulation buttons (for realistic label test cases) */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Test Product Label Scenarios
                  </span>
                  <span className="text-[10px] text-slate-400">1-click test</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleScanSuccess('CUTE PLUS I', 'QR_CODE')}
                    className="p-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-mono text-[11px] font-bold rounded border border-slate-200 text-left transition"
                  >
                    1. Model: CUTE PLUS I
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScanSuccess('260604311103', 'CODE_128')}
                    className="p-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-mono text-[11px] font-bold rounded border border-slate-200 text-left transition"
                  >
                    2. Serial: 260604311103
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScanSuccess('https://ewarranty.ksbpumps.com/reg', 'QR_CODE')}
                    className="p-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-mono text-[10px] font-bold rounded border border-slate-200 text-left truncate transition"
                    title="Warranty QR without model"
                  >
                    3. Warranty QR (No Model)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScanSuccess('https://ewarranty.ksb.com/register?sn=260604311103&model=CUTE%20PLUS%20I', 'QR_CODE')}
                    className="p-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-mono text-[10px] font-bold rounded border border-slate-200 text-left truncate transition"
                    title="Warranty QR with Serial"
                  >
                    4. Warranty QR + Serial
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CODE SCANNED & ANALYZED RESULT SHEET */}
          {detectedAnalysis && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
              {/* Status Header Badge */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  detectedAnalysis.type === 'RECOGNIZED_MODEL'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : detectedAnalysis.type === 'SERIAL_OR_1D_BARCODE'
                    ? 'bg-blue-50 border-blue-200 text-blue-950'
                    : detectedAnalysis.type === 'WARRANTY_URL_ONLY'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {detectedAnalysis.type === 'RECOGNIZED_MODEL' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : detectedAnalysis.type === 'WARRANTY_URL_ONLY' ? (
                  <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Barcode className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                )}

                <div className="min-w-0 text-xs">
                  <div className="font-bold text-sm">
                    {detectedAnalysis.type === 'RECOGNIZED_MODEL'
                      ? 'Recognized Equipment Model'
                      : detectedAnalysis.type === 'SERIAL_OR_1D_BARCODE'
                      ? '1D Barcode / Serial Number Detected'
                      : detectedAnalysis.type === 'WARRANTY_URL_ONLY'
                      ? 'Warranty Registration QR Code (Not a Model)'
                      : detectedAnalysis.type === 'WARRANTY_URL_WITH_SERIAL'
                      ? 'Warranty QR with Serial Number'
                      : 'Unrecognized Code Value'}
                  </div>
                  <p className="mt-0.5 text-slate-600 leading-relaxed">
                    {detectedAnalysis.description}
                  </p>
                </div>
              </div>

              {/* Scanned Value Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Scanned Raw Value
                </span>
                <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 break-all bg-white p-2 rounded border border-slate-200 select-all">
                  {detectedAnalysis.rawText}
                </div>
              </div>

              {/* RESOLUTION ACTIONS */}

              {/* CASE 1: RECOGNIZED MODEL NUMBER */}
              {detectedAnalysis.type === 'RECOGNIZED_MODEL' && detectedAnalysis.modelNumber && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyModelAction(
                        detectedAnalysis.modelNumber!,
                        detectedAnalysis.serialNumber
                      )
                    }
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Fill Model Field: {detectedAnalysis.modelNumber}</span>
                  </button>
                  <p className="text-[11px] text-slate-500 text-center">
                    Associated pump specifications (HP, Phase, kW) will be automatically autofilled.
                  </p>
                </div>
              )}

              {/* CASE 2: SERIAL NUMBER / 1D BARCODE */}
              {(detectedAnalysis.type === 'SERIAL_OR_1D_BARCODE' ||
                detectedAnalysis.type === 'WARRANTY_URL_WITH_SERIAL') && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-700">Choose how to apply this barcode:</div>

                  {/* If serial matched an existing stock entry */}
                  {detectedAnalysis.matchedExistingEntry && (
                    <button
                      type="button"
                      onClick={() =>
                        handleApplySerialAction(
                          detectedAnalysis.serialNumber!,
                          detectedAnalysis.matchedExistingEntry?.modelNumber
                        )
                      }
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-between"
                    >
                      <span>
                        Apply Serial & Auto-select Model ({detectedAnalysis.matchedExistingEntry.modelNumber})
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {/* Primary: Fill Serial Number Field */}
                  <button
                    type="button"
                    onClick={() =>
                      handleApplySerialAction(
                        detectedAnalysis.serialNumber || detectedAnalysis.rawText
                      )
                    }
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-between"
                  >
                    <span>
                      Apply as Serial Number: &quot;{detectedAnalysis.serialNumber || detectedAnalysis.rawText}&quot;
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Secondary: Treat as Model Number */}
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyModelAction(
                        detectedAnalysis.serialNumber || detectedAnalysis.rawText
                      )
                    }
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition flex items-center justify-between"
                  >
                    <span>Apply as Model Number instead</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              )}

              {/* CASE 3: WARRANTY REGISTRATION URL ONLY (Requirement 3: Never put warranty URL into Model field!) */}
              {detectedAnalysis.type === 'WARRANTY_URL_ONLY' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    <strong className="block font-bold mb-1">
                      Safe Guard: Model Field Protected
                    </strong>
                    This QR code points to an external customer warranty registration portal. As per
                    warehouse rules, warranty URLs are <strong>never</strong> applied into the Model
                    Number field.
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRestartScan}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      Scan Another Label / 1D Barcode
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* CASE 4: UNRECOGNIZED VALUE */}
              {detectedAnalysis.type === 'UNRECOGNIZED' && (
                <div className="space-y-2.5">
                  <div className="text-xs text-slate-600">
                    The scanned text is not in the standard catalog. Select how to apply it:
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleApplySerialAction(detectedAnalysis.rawText)
                      }
                      className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-between"
                    >
                      <span>Apply as Serial Number</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleApplyModelAction(detectedAnalysis.rawText)
                      }
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center justify-between"
                    >
                      <span>Apply as Custom Model Number</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Reset / Re-scan Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRestartScan}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Scan another code
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
