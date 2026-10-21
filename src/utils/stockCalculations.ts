import { StockEntry, ModelSummary, FilterCriteria, PhaseType, StockCategory } from '../types/inventory';
import Papa from 'papaparse';

/**
 * Normalizes phase string to '1 PH' | '3 PH' | 'NA'
 */
export function normalizePhase(val: unknown): PhaseType {
  const s = String(val ?? '').trim().toUpperCase();
  if (s.includes('3') && s.includes('PH')) return '3 PH';
  if (s.includes('1') && s.includes('PH')) return '1 PH';
  return 'NA';
}

/**
 * Normalizes category string to known categories
 */
export function normalizeCategory(val: unknown): StockCategory {
  const s = String(val ?? '').trim().toLowerCase();
  if (s.includes('spare')) return 'Spare Parts';
  if (s.includes('service') || s.includes('repair')) return 'Service';
  return 'Motors / Pumps';
}

/**
 * Checks if an entry is marked as deleted in Recycle Bin
 */
export function isRecycleBinEntry(entry: { remarks?: string }): boolean {
  return String(entry.remarks || '').includes('[RECYCLE_BIN]');
}

/**
 * Calculates overall stock totals (excluding Recycle Bin entries)
 */
export function calculateStockBalance(entries: StockEntry[]): {
  totalEntries: number;
  totalIn: number;
  totalOut: number;
  currentBalance: number;
  uniqueModelsCount: number;
  recycleBinCount: number;
} {
  let totalIn = 0;
  let totalOut = 0;
  let recycleBinCount = 0;
  const uniqueModels = new Set<string>();

  for (const entry of entries) {
    if (isRecycleBinEntry(entry)) {
      recycleBinCount++;
      continue;
    }
    const qty = Math.max(0, Number(entry.quantity) || 0);
    if (entry.type === 'Stock In') {
      totalIn += qty;
    } else {
      totalOut += qty;
    }
    const modelKey = (entry.modelNumber || entry.modelName || '').trim().toUpperCase();
    if (modelKey) {
      uniqueModels.add(modelKey);
    }
  }

  return {
    totalEntries: entries.length - recycleBinCount,
    totalIn,
    totalOut,
    currentBalance: totalIn - totalOut,
    uniqueModelsCount: uniqueModels.size,
    recycleBinCount,
  };
}

/**
 * Aggregates stock by model number
 */
export function calculateModelBalances(entries: StockEntry[]): ModelSummary[] {
  const modelMap = new Map<string, ModelSummary>();

  for (const entry of entries) {
    if (isRecycleBinEntry(entry)) continue;

    const key = (entry.modelNumber || entry.modelName || 'Unspecified').trim();
    if (!key) continue;

    let summary = modelMap.get(key.toUpperCase());
    if (!summary) {
      summary = {
        modelNumber: entry.modelNumber || key,
        modelName: entry.modelName,
        category: entry.category,
        hp: entry.hp,
        phase: entry.phase,
        kw: entry.kw,
        stockInTotal: 0,
        stockOutTotal: 0,
        currentBalance: 0,
        activeSerialNumbers: [],
      };
      modelMap.set(key.toUpperCase(), summary);
    }

    const qty = Math.max(0, Number(entry.quantity) || 0);
    if (entry.type === 'Stock In') {
      summary.stockInTotal += qty;
      summary.currentBalance += qty;
      if (entry.serialNumber && !summary.activeSerialNumbers.includes(entry.serialNumber)) {
        summary.activeSerialNumbers.push(entry.serialNumber);
      }
    } else {
      summary.stockOutTotal += qty;
      summary.currentBalance -= qty;
      if (entry.serialNumber) {
        summary.activeSerialNumbers = summary.activeSerialNumbers.filter((s) => s !== entry.serialNumber);
      }
    }

    if (!summary.lastMovementDate || entry.date > summary.lastMovementDate) {
      summary.lastMovementDate = entry.date;
    }
    // Update specs if available
    if (!summary.hp && entry.hp) summary.hp = entry.hp;
    if ((!summary.phase || summary.phase === 'NA') && entry.phase && entry.phase !== 'NA') summary.phase = entry.phase;
    if (!summary.kw && entry.kw) summary.kw = entry.kw;
  }

  return Array.from(modelMap.values()).sort((a, b) => a.modelNumber.localeCompare(b.modelNumber));
}

/**
 * Identifies low-stock items (balance <= threshold, default 2)
 */
export function getLowStockItems(entries: StockEntry[], threshold = 2): ModelSummary[] {
  const modelSummaries = calculateModelBalances(entries);
  return modelSummaries.filter((m) => m.currentBalance <= threshold);
}

/**
 * Multi-field filtering matching user requirements:
 * Model number, serial number, party name, and invoice number.
 */
export function filterStockEntries(entries: StockEntry[], filters: FilterCriteria): StockEntry[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return entries.filter((entry) => {
    // Recycle bin filtering
    const inRecycle = isRecycleBinEntry(entry);
    if (filters.hideRecycleBin && inRecycle) return false;

    // Movement type filter
    if (filters.movementType && filters.movementType !== 'All' && entry.type !== filters.movementType) {
      return false;
    }

    // Category filter
    if (filters.category && filters.category !== 'All' && entry.category !== filters.category) {
      return false;
    }

    // Phase filter
    if (filters.phase && filters.phase !== 'All' && entry.phase !== filters.phase) {
      return false;
    }

    // Date range
    if (filters.startDate && entry.date && entry.date < filters.startDate) {
      return false;
    }
    if (filters.endDate && entry.date && entry.date > filters.endDate) {
      return false;
    }

    // Search query matches modelNumber, serialNumber, party, invoiceNumber, modelName, remarks
    if (query) {
      const matchModelNum = (entry.modelNumber || '').toLowerCase().includes(query);
      const matchModelName = (entry.modelName || '').toLowerCase().includes(query);
      const matchSerial = (entry.serialNumber || '').toLowerCase().includes(query);
      const matchParty = (entry.party || '').toLowerCase().includes(query);
      const matchInvoice = (entry.invoiceNumber || '').toLowerCase().includes(query);
      const matchRemarks = (entry.remarks || '').toLowerCase().includes(query);

      if (!matchModelNum && !matchModelName && !matchSerial && !matchParty && !matchInvoice && !matchRemarks) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Checks if a serial number is already in stock (for duplicate prevention)
 */
export function detectDuplicateSerial(
  entries: StockEntry[],
  serialNumber: string,
  excludeEntryId?: string
): { isDuplicate: boolean; existingEntry?: StockEntry } {
  const cleanSerial = serialNumber.trim().toUpperCase();
  if (!cleanSerial) return { isDuplicate: false };

  // Find all non-recycle bin movements for this serial number
  const serialMovements = entries.filter(
    (e) => !isRecycleBinEntry(e) && e.id !== excludeEntryId && (e.serialNumber || '').trim().toUpperCase() === cleanSerial
  );

  if (serialMovements.length === 0) return { isDuplicate: false };

  // Calculate net presence:
  let netQty = 0;
  for (const m of serialMovements) {
    if (m.type === 'Stock In') netQty += m.quantity;
    else netQty -= m.quantity;
  }

  if (netQty > 0) {
    return { isDuplicate: true, existingEntry: serialMovements[0] };
  }

  return { isDuplicate: false };
}

/**
 * Validates whether a Stock Out request can be fulfilled
 */
export function validateStockOut(
  entries: StockEntry[],
  modelIdentifier: string,
  requestedQuantity: number
): { valid: boolean; currentBalance: number; error?: string } {
  const modelBalances = calculateModelBalances(entries);
  const target = (modelIdentifier || '').trim().toUpperCase();
  const found = modelBalances.find((m) => m.modelNumber.toUpperCase() === target);
  const currentBalance = found ? found.currentBalance : 0;

  if (currentBalance < requestedQuantity) {
    return {
      valid: false,
      currentBalance,
      error: `Insufficient stock for ${modelIdentifier}. Available: ${currentBalance}, Requested: ${requestedQuantity}`,
    };
  }

  return { valid: true, currentBalance };
}

/**
 * Parses raw Firestore REST API document object to a typed StockEntry
 */
export function parseFirestoreDocument(doc: any, index = 0): StockEntry {
  const fields = doc?.fields || {};
  const nameParts = String(doc?.name || '').split('/');
  const docId = nameParts[nameParts.length - 1] || `entry-${index}-${Date.now()}`;

  const extractString = (field: any): string => {
    if (!field || typeof field !== 'object') return '';
    if (typeof field.stringValue === 'string') return field.stringValue;
    if (typeof field.integerValue === 'string' || typeof field.integerValue === 'number') return String(field.integerValue);
    if (typeof field.doubleValue === 'string' || typeof field.doubleValue === 'number') return String(field.doubleValue);
    if (typeof field.timestampValue === 'string') return field.timestampValue;
    return '';
  };

  const extractNumber = (field: any): number => {
    if (!field || typeof field !== 'object') return 0;
    if (typeof field.integerValue === 'string' || typeof field.integerValue === 'number') return Number(field.integerValue) || 0;
    if (typeof field.doubleValue === 'string' || typeof field.doubleValue === 'number') return Number(field.doubleValue) || 0;
    return 0;
  };

  const rawType = extractString(fields.type);
  const rawPhase = extractString(fields.phase);
  const rawCategory = extractString(fields.category);

  return {
    id: docId,
    date: extractString(fields.date),
    type: rawType === 'Stock Out' ? 'Stock Out' : 'Stock In',
    category: normalizeCategory(rawCategory),
    modelName: extractString(fields.modelName),
    modelNumber: extractString(fields.modelNumber),
    serialNumber: extractString(fields.serialNumber),
    hp: extractString(fields.hp),
    phase: normalizePhase(rawPhase),
    kw: extractString(fields.kw),
    quantity: Math.max(1, extractNumber(fields.quantity) || 1),
    party: extractString(fields.party),
    invoiceNumber: extractString(fields.invoiceNumber),
    photo: extractString(fields.photo),
    remarks: extractString(fields.remarks),
    createdAt: extractString(fields.createdAt) || String(doc?.createTime || new Date().toISOString()),
  };
}

/**
 * Formats a StockEntry into exact Firestore document fields representation
 */
export function formatFirestoreDocument(entry: Omit<StockEntry, 'id' | 'createdAt'> & { createdAt?: string }) {
  return {
    fields: {
      date: { stringValue: String(entry.date || '') },
      type: { stringValue: entry.type === 'Stock Out' ? 'Stock Out' : 'Stock In' },
      category: { stringValue: normalizeCategory(entry.category) },
      modelName: { stringValue: String(entry.modelName || '') },
      modelNumber: { stringValue: String(entry.modelNumber || '') },
      serialNumber: { stringValue: String(entry.serialNumber || '') },
      hp: { stringValue: String(entry.hp || '') },
      phase: { stringValue: normalizePhase(entry.phase) },
      kw: { stringValue: String(entry.kw || '') },
      quantity: { integerValue: String(Math.max(1, Number(entry.quantity || 1))) },
      party: { stringValue: String(entry.party || '') },
      invoiceNumber: { stringValue: String(entry.invoiceNumber || '') },
      photo: { stringValue: String(entry.photo || '') },
      remarks: { stringValue: String(entry.remarks || '') },
      createdAt: { timestampValue: entry.createdAt || new Date().toISOString() },
    },
  };
}

/**
 * Generates CSV string from stock entries
 */
export function generateCsvData(entries: StockEntry[]): string {
  const data = entries.map((e) => ({
    'Entry ID': e.id,
    'Date': e.date,
    'Type': e.type,
    'Category': e.category,
    'Model Number': e.modelNumber,
    'Model Name': e.modelName,
    'Serial Number': e.serialNumber,
    'HP': e.hp,
    'Phase': e.phase,
    'KW': e.kw,
    'Quantity': e.quantity,
    'Party / Destination': e.party,
    'Invoice Number': e.invoiceNumber,
    'Remarks': e.remarks,
    'Attachment URL': e.photo,
    'Created At': e.createdAt,
  }));

  return Papa.unparse(data);
}

/**
 * Parses CSV text into StockEntry candidates
 */
export function parseCsvData(csvText: string): { entries: Partial<StockEntry>[]; errors: string[] } {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const parsedEntries: Partial<StockEntry>[] = [];
  const errors: string[] = [];

  result.data.forEach((row, idx) => {
    const rowNum = idx + 2; // header is line 1
    const modelNumber = row['Model Number'] || row['modelNumber'] || row['Model'] || row['model'] || '';
    const rawType = (row['Type'] || row['type'] || 'Stock In').trim();
    const type = rawType.toLowerCase().includes('out') ? 'Stock Out' : 'Stock In';
    const quantity = parseInt(row['Quantity'] || row['quantity'] || '1', 10);

    if (!modelNumber) {
      errors.push(`Row ${rowNum}: Missing Model Number`);
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      errors.push(`Row ${rowNum}: Invalid quantity (${row['Quantity']})`);
      return;
    }

    parsedEntries.push({
      date: (row['Date'] || row['date'] || new Date().toISOString().split('T')[0]).trim(),
      type,
      category: normalizeCategory(row['Category'] || row['category']),
      modelNumber: modelNumber.trim(),
      modelName: (row['Model Name'] || row['modelName'] || '').trim(),
      serialNumber: (row['Serial Number'] || row['serialNumber'] || row['Serial'] || '').trim(),
      hp: (row['HP'] || row['hp'] || '').trim(),
      phase: normalizePhase(row['Phase'] || row['phase']),
      kw: (row['KW'] || row['kw'] || '').trim(),
      quantity,
      party: (row['Party / Destination'] || row['Party'] || row['party'] || '').trim(),
      invoiceNumber: (row['Invoice Number'] || row['Invoice'] || row['invoiceNumber'] || '').trim(),
      remarks: (row['Remarks'] || row['remarks'] || '').trim(),
      photo: (row['Attachment URL'] || row['photo'] || '').trim(),
    });
  });

  return { entries: parsedEntries, errors };
}
