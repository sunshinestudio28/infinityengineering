import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStockBalance,
  calculateModelBalances,
  getLowStockItems,
  filterStockEntries,
  detectDuplicateSerial,
  validateStockOut,
  parseFirestoreDocument,
  formatFirestoreDocument,
  generateCsvData,
  parseCsvData,
  normalizePhase,
  normalizeCategory,
} from './stockCalculations';
import { StockEntry } from '../types/inventory';

const mockEntries: StockEntry[] = [
  {
    id: 'entry-1',
    date: '2026-03-01',
    type: 'Stock In',
    category: 'Motors / Pumps',
    modelName: 'End Suction Pump',
    modelNumber: 'ETN 50-32-200 GG',
    serialNumber: 'IEG-2026-001',
    hp: '7.5',
    phase: '3 PH',
    kw: '5.5',
    quantity: 5,
    party: 'KSB Pumps Manufacturer',
    invoiceNumber: 'INV-8821',
    photo: '',
    remarks: 'Received in good condition',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'entry-2',
    date: '2026-03-05',
    type: 'Stock Out',
    category: 'Motors / Pumps',
    modelName: 'End Suction Pump',
    modelNumber: 'ETN 50-32-200 GG',
    serialNumber: 'IEG-2026-001',
    hp: '7.5',
    phase: '3 PH',
    kw: '5.5',
    quantity: 2,
    party: 'Royal Sugar Mills',
    invoiceNumber: 'OUT-1044',
    photo: '',
    remarks: 'Dispatched via truck',
    createdAt: '2026-03-05T14:30:00Z',
  },
  {
    id: 'entry-3',
    date: '2026-03-10',
    type: 'Stock In',
    category: 'Spare Parts',
    modelName: 'Mechanical Seal',
    modelNumber: 'MS-ETN-50',
    serialNumber: '',
    hp: '',
    phase: 'NA',
    kw: '',
    quantity: 1,
    party: 'SealTech Ltd',
    invoiceNumber: 'INV-4022',
    photo: '',
    remarks: 'Urgent stock for maintenance',
    createdAt: '2026-03-10T09:15:00Z',
  },
  {
    id: 'entry-4-recycled',
    date: '2026-03-11',
    type: 'Stock In',
    category: 'Service',
    modelName: 'Submersible Pump',
    modelNumber: 'OPAL 15i',
    serialNumber: 'SRV-999',
    hp: '1.5',
    phase: '1 PH',
    kw: '1.1',
    quantity: 10,
    party: 'Discarded Entry',
    invoiceNumber: 'ERR-00',
    photo: '',
    remarks: '[RECYCLE_BIN] mistyped entry',
    createdAt: '2026-03-11T12:00:00Z',
  },
];

test('calculateStockBalance calculates totals accurately excluding recycle bin', () => {
  const result = calculateStockBalance(mockEntries);
  // Total In: 5 (ETN) + 1 (MS-ETN) = 6
  // Total Out: 2 (ETN) = 2
  // Current Balance: 6 - 2 = 4
  // Total Active Entries: 3
  // Recycle Bin Count: 1
  assert.equal(result.totalIn, 6);
  assert.equal(result.totalOut, 2);
  assert.equal(result.currentBalance, 4);
  assert.equal(result.totalEntries, 3);
  assert.equal(result.recycleBinCount, 1);
  assert.equal(result.uniqueModelsCount, 2);
});

test('calculateModelBalances calculates balances per model', () => {
  const summaries = calculateModelBalances(mockEntries);
  assert.equal(summaries.length, 2);

  const etnSummary = summaries.find((s) => s.modelNumber === 'ETN 50-32-200 GG');
  assert.ok(etnSummary);
  assert.equal(etnSummary.stockInTotal, 5);
  assert.equal(etnSummary.stockOutTotal, 2);
  assert.equal(etnSummary.currentBalance, 3);

  const sealSummary = summaries.find((s) => s.modelNumber === 'MS-ETN-50');
  assert.ok(sealSummary);
  assert.equal(sealSummary.currentBalance, 1);
});

test('getLowStockItems returns models at or below threshold', () => {
  const lowStock = getLowStockItems(mockEntries, 2);
  assert.equal(lowStock.length, 1);
  assert.equal(lowStock[0].modelNumber, 'MS-ETN-50');
  assert.equal(lowStock[0].currentBalance, 1);
});

test('filterStockEntries filters accurately by search criteria', () => {
  // Search by model number
  const byModel = filterStockEntries(mockEntries, { searchQuery: 'ETN 50' });
  assert.equal(byModel.length, 2);

  // Search by serial number
  const bySerial = filterStockEntries(mockEntries, { searchQuery: 'IEG-2026-001' });
  assert.equal(bySerial.length, 2);

  // Search by party name
  const byParty = filterStockEntries(mockEntries, { searchQuery: 'Sugar Mills' });
  assert.equal(byParty.length, 1);
  assert.equal(byParty[0].id, 'entry-2');

  // Search by invoice number
  const byInvoice = filterStockEntries(mockEntries, { searchQuery: 'INV-8821' });
  assert.equal(byInvoice.length, 1);
  assert.equal(byInvoice[0].id, 'entry-1');

  // Hide recycle bin
  const withoutRecycle = filterStockEntries(mockEntries, { searchQuery: '', hideRecycleBin: true });
  assert.equal(withoutRecycle.length, 3);
});

test('detectDuplicateSerial detects active serial numbers correctly', () => {
  // IEG-2026-001 has 1 in (qty 5) and 1 out (qty 2), net qty > 0
  const result = detectDuplicateSerial(mockEntries, 'IEG-2026-001');
  assert.equal(result.isDuplicate, true);

  // Non-existent serial
  const nonExistent = detectDuplicateSerial(mockEntries, 'NON-EXISTENT');
  assert.equal(nonExistent.isDuplicate, false);
});

test('validateStockOut correctly guards against overdraw', () => {
  // ETN has 3 in stock
  const validCheck = validateStockOut(mockEntries, 'ETN 50-32-200 GG', 2);
  assert.equal(validCheck.valid, true);

  const invalidCheck = validateStockOut(mockEntries, 'ETN 50-32-200 GG', 10);
  assert.equal(invalidCheck.valid, false);
  assert.equal(invalidCheck.currentBalance, 3);
});

test('Firestore parsing and formatting roundtrip preserves exact fields', () => {
  const formatted = formatFirestoreDocument({
    date: '2026-04-01',
    type: 'Stock In',
    category: 'Motors / Pumps',
    modelName: 'Centrifugal Pump',
    modelNumber: 'ETN 65-40-160 GI',
    serialNumber: 'SN-7788',
    hp: '10',
    phase: '3 PH',
    kw: '7.5',
    quantity: 4,
    party: 'Prime Power Corp',
    invoiceNumber: 'INV-900',
    photo: 'https://cloudinary.com/test.jpg',
    remarks: 'Standard shipment',
    createdAt: '2026-04-01T08:00:00Z',
  });

  const parsed = parseFirestoreDocument({
    name: 'projects/infinity-engineering-stock/databases/(default)/documents/stockEntries/test-doc-123',
    fields: formatted.fields,
  });

  assert.equal(parsed.id, 'test-doc-123');
  assert.equal(parsed.modelNumber, 'ETN 65-40-160 GI');
  assert.equal(parsed.quantity, 4);
  assert.equal(parsed.phase, '3 PH');
  assert.equal(parsed.category, 'Motors / Pumps');
  assert.equal(parsed.type, 'Stock In');
});

test('CSV export and import parsing work seamlessly', () => {
  const csv = generateCsvData(mockEntries.slice(0, 2));
  assert.ok(csv.includes('ETN 50-32-200 GG'));
  assert.ok(csv.includes('Royal Sugar Mills'));

  const parsed = parseCsvData(csv);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[0].modelNumber, 'ETN 50-32-200 GG');
  assert.equal(parsed.entries[1].quantity, 2);
  assert.equal(parsed.entries[1].type, 'Stock Out');
});

test('normalizePhase and normalizeCategory handle messy inputs', () => {
  assert.equal(normalizePhase('3 phase'), '3 PH');
  assert.equal(normalizePhase('single 1 ph'), '1 PH');
  assert.equal(normalizePhase(''), 'NA');

  assert.equal(normalizeCategory('spare parts'), 'Spare Parts');
  assert.equal(normalizeCategory('service and repairs'), 'Service');
  assert.equal(normalizeCategory('pumps'), 'Motors / Pumps');
});
