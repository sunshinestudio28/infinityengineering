import { StockEntry } from '../types/inventory';
import { KnownProductModel, KNOWN_MODELS } from '../data/knownModels';

export type ScannedCodeType =
  | 'RECOGNIZED_MODEL'
  | 'SERIAL_OR_1D_BARCODE'
  | 'WARRANTY_URL_WITH_SERIAL'
  | 'WARRANTY_URL_ONLY'
  | 'UNRECOGNIZED';

export interface ScannedCodeAnalysis {
  rawText: string;
  type: ScannedCodeType;
  modelNumber?: string;
  serialNumber?: string;
  description: string;
  suggestedAction: 'FILL_MODEL' | 'FILL_SERIAL' | 'CHOOSE_ACTION' | 'WARRANTY_WARNING';
  matchedExistingEntry?: StockEntry;
  brand?: string;
}

/**
 * Normalizes model names for resilient matching
 * e.g., 'CUTE PLUS 1' -> 'CUTE PLUS I'
 */
export function normalizeModelString(str: string): string {
  let s = str.trim().toUpperCase();
  // KSB specific normalization
  s = s.replace(/\bCUTE\s*PLUS\s*1\b/i, 'CUTE PLUS I');
  s = s.replace(/\bCUTE\s*PLUS\s*I\b/i, 'CUTE PLUS I');
  s = s.replace(/\s+/g, ' ');
  return s;
}

/**
 * Classifies a scanned string from a 1D barcode or 2D QR code
 */
export function classifyScannedCode(
  rawText: string,
  existingEntries: StockEntry[] = [],
  catalog: KnownProductModel[] = KNOWN_MODELS
): ScannedCodeAnalysis {
  const text = (rawText || '').trim();
  if (!text) {
    return {
      rawText: '',
      type: 'UNRECOGNIZED',
      description: 'Empty scan result',
      suggestedAction: 'CHOOSE_ACTION',
    };
  }

  // 1. Check if URL (Common on pump labels for e-warranty or product registration)
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const isWarrantyUrl =
        /warranty|register|reg|service|ewarranty|product-reg/i.test(url.href) ||
        /ksb|pumps/i.test(url.hostname);

      // Check query parameters for embedded serial number or model
      const serialParam =
        url.searchParams.get('sn') ||
        url.searchParams.get('serial') ||
        url.searchParams.get('serialNumber') ||
        url.searchParams.get('barcode') ||
        url.searchParams.get('sno');

      const modelParam =
        url.searchParams.get('model') ||
        url.searchParams.get('modelNumber') ||
        url.searchParams.get('product') ||
        url.searchParams.get('item');

      if (serialParam) {
        return {
          rawText: text,
          type: 'WARRANTY_URL_WITH_SERIAL',
          serialNumber: serialParam.trim(),
          modelNumber: modelParam ? normalizeModelString(modelParam) : undefined,
          description: `E-Warranty QR Code detected with Serial Number (${serialParam}).`,
          suggestedAction: 'FILL_SERIAL',
        };
      }

      if (isWarrantyUrl || !modelParam) {
        return {
          rawText: text,
          type: 'WARRANTY_URL_ONLY',
          description:
            'This QR code is for e-warranty registration and does NOT contain a model number.',
          suggestedAction: 'WARRANTY_WARNING',
        };
      }

      if (modelParam) {
        const normModel = normalizeModelString(modelParam);
        return {
          rawText: text,
          type: 'RECOGNIZED_MODEL',
          modelNumber: normModel,
          description: `Extracted model parameter from QR URL: ${normModel}`,
          suggestedAction: 'FILL_MODEL',
        };
      }
    } catch {
      // Invalid URL
    }
  }

  // 2. Check JSON payload
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const obj = JSON.parse(text);
      const model = obj.model || obj.modelNumber || obj.item || '';
      const serial = obj.serial || obj.serialNumber || obj.sn || '';
      if (model || serial) {
        return {
          rawText: text,
          type: model ? 'RECOGNIZED_MODEL' : 'SERIAL_OR_1D_BARCODE',
          modelNumber: model ? normalizeModelString(String(model)) : undefined,
          serialNumber: serial ? String(serial).trim() : undefined,
          description: 'Extracted equipment details from JSON QR payload.',
          suggestedAction: model ? 'FILL_MODEL' : 'FILL_SERIAL',
        };
      }
    } catch {
      // ignore
    }
  }

  // 3. Exact or normalized model match in catalog or previous entries
  const normalizedScan = normalizeModelString(text);

  // Check catalog
  const catalogMatch = catalog.find((m) => {
    const normCatalog = normalizeModelString(m.modelNumber);
    return (
      normCatalog === normalizedScan ||
      normCatalog.replace(/\s+/g, '') === normalizedScan.replace(/\s+/g, '')
    );
  });

  if (catalogMatch) {
    return {
      rawText: text,
      type: 'RECOGNIZED_MODEL',
      modelNumber: catalogMatch.modelNumber,
      description: `Recognized product model from catalog: ${catalogMatch.modelNumber}`,
      suggestedAction: 'FILL_MODEL',
    };
  }

  // Check if string contains "CUTE PLUS" or "ETN" or other distinct model series
  if (
    /\bCUTE\s*PLUS\s*(?:I|1|1\.0|0\.5)\b/i.test(text) ||
    /^ETN\s+\d+-\d+-\d+/i.test(text) ||
    /^OPAL\s+\d+/i.test(text) ||
    /^AQUA\s+SIMBA/i.test(text)
  ) {
    const modelNum = normalizeModelString(text);
    return {
      rawText: text,
      type: 'RECOGNIZED_MODEL',
      modelNumber: modelNum,
      description: `Recognized pump model series: ${modelNum}`,
      suggestedAction: 'FILL_MODEL',
    };
  }

  // 4. Check if matched an existing recorded serial number in database
  const serialMatch = existingEntries.find(
    (e) => (e.serialNumber || '').trim().toUpperCase() === text.toUpperCase()
  );
  if (serialMatch) {
    return {
      rawText: text,
      type: 'SERIAL_OR_1D_BARCODE',
      serialNumber: text,
      modelNumber: serialMatch.modelNumber,
      matchedExistingEntry: serialMatch,
      description: `Recognized serial number in stock: ${text} (${serialMatch.modelNumber})`,
      suggestedAction: 'FILL_SERIAL',
    };
  }

  // 5. 1D Barcode / Serial Number heuristic:
  // Numbers between 6 and 24 digits (e.g., KSB 12-digit serial like '260604311103', EAN-13 '8901234567890', etc.)
  // or strings starting with common serial prefixes SN, IEG, SER, NO, etc.
  const isPureNumber = /^\d{6,24}$/.test(text);
  const isSerialPattern = /^(?:SN|IEG|SRV|AQ|OP|KSB)[-_:]?[A-Z0-9]+$/i.test(text);

  if (isPureNumber || isSerialPattern) {
    return {
      rawText: text,
      type: 'SERIAL_OR_1D_BARCODE',
      serialNumber: text,
      description: isPureNumber
        ? `Numeric barcode / serial number detected (${text.length} digits): ${text}`
        : `Serial number format detected: ${text}`,
      suggestedAction: 'FILL_SERIAL',
    };
  }

  // 6. Fallback: Unrecognized value
  return {
    rawText: text,
    type: 'UNRECOGNIZED',
    description: `Scanned value '${text}' was not recognized as a standard model or serial number.`,
    suggestedAction: 'CHOOSE_ACTION',
  };
}
