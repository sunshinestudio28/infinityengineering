import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyScannedCode, normalizeModelString } from './barcodeClassifier';
import { StockEntry } from '../types/inventory';
import { KnownProductModel } from '../data/knownModels';

const testCatalog: KnownProductModel[] = [
  { modelNumber: 'CUTE PLUS I', hp: '1', phase: '1 PH', kw: '0.75', category: 'Motors / Pumps' },
  { modelNumber: 'ETN 50-32-200 GG', hp: '7.5', phase: '3 PH', kw: '5.5', category: 'Motors / Pumps' },
  { modelNumber: 'OPAL 15i (1.5HP)', hp: '1.5', phase: '1 PH', kw: '1.1', category: 'Motors / Pumps' },
];

const testEntries: StockEntry[] = [
  {
    id: 'e1',
    date: '2026-04-10',
    type: 'Stock In',
    category: 'Motors / Pumps',
    modelName: 'Submersible Pump',
    modelNumber: 'OPAL 15i (1.5HP)',
    serialNumber: '260604311103',
    hp: '1.5',
    phase: '1 PH',
    kw: '1.1',
    quantity: 1,
    party: 'KSB',
    invoiceNumber: 'INV-1',
    photo: '',
    remarks: '',
    createdAt: '2026-04-10T10:00:00Z',
  },
];

test('normalizes CUTE PLUS variants to CUTE PLUS I', () => {
  assert.equal(normalizeModelString('CUTE PLUS 1'), 'CUTE PLUS I');
  assert.equal(normalizeModelString('cute plus i'), 'CUTE PLUS I');
});

test('recognizes product model from catalog', () => {
  const result = classifyScannedCode('CUTE PLUS I', testEntries, testCatalog);
  assert.equal(result.type, 'RECOGNIZED_MODEL');
  assert.equal(result.modelNumber, 'CUTE PLUS I');
  assert.equal(result.suggestedAction, 'FILL_MODEL');
});

test('recognizes CUTE PLUS 1 as CUTE PLUS I model', () => {
  const result = classifyScannedCode('CUTE PLUS 1', testEntries, testCatalog);
  assert.equal(result.type, 'RECOGNIZED_MODEL');
  assert.equal(result.modelNumber, 'CUTE PLUS I');
});

test('detects 12-digit KSB pump serial as SERIAL_OR_1D_BARCODE and never as a model', () => {
  const result = classifyScannedCode('260604311103', [], testCatalog);
  assert.equal(result.type, 'SERIAL_OR_1D_BARCODE');
  assert.equal(result.serialNumber, '260604311103');
  assert.equal(result.suggestedAction, 'FILL_SERIAL');
  // Model number must NOT be blindly populated with the serial number
  assert.equal(result.modelNumber, undefined);
});

test('detects serial number already in stock and identifies associated model', () => {
  const result = classifyScannedCode('260604311103', testEntries, testCatalog);
  assert.equal(result.type, 'SERIAL_OR_1D_BARCODE');
  assert.equal(result.serialNumber, '260604311103');
  assert.equal(result.matchedExistingEntry?.modelNumber, 'OPAL 15i (1.5HP)');
});

test('rejects warranty URL without model and warns user', () => {
  const warrantyUrl = 'https://ewarranty.ksbpumps.com/registration';
  const result = classifyScannedCode(warrantyUrl, testEntries, testCatalog);
  assert.equal(result.type, 'WARRANTY_URL_ONLY');
  assert.equal(result.suggestedAction, 'WARRANTY_WARNING');
  assert.equal(result.modelNumber, undefined);
});

test('extracts serial number from warranty QR code query parameters', () => {
  const warrantyWithSn = 'https://register.ksb.com/ewarranty?sn=260604311103&brand=KSB';
  const result = classifyScannedCode(warrantyWithSn, testEntries, testCatalog);
  assert.equal(result.type, 'WARRANTY_URL_WITH_SERIAL');
  assert.equal(result.serialNumber, '260604311103');
  assert.equal(result.suggestedAction, 'FILL_SERIAL');
});

test('extracts model from URL if explicitly present in parameters', () => {
  const urlWithModel = 'https://inventory.example.com/item?model=ETN%2050-32-200%20GG';
  const result = classifyScannedCode(urlWithModel, testEntries, testCatalog);
  assert.equal(result.type, 'RECOGNIZED_MODEL');
  assert.equal(result.modelNumber, 'ETN 50-32-200 GG');
});

test('handles unknown barcode strings safely without putting into model field', () => {
  const unknown = 'XYZ-UNKNOWN-VAL-999';
  const result = classifyScannedCode(unknown, testEntries, testCatalog);
  assert.equal(result.type, 'UNRECOGNIZED');
  assert.equal(result.suggestedAction, 'CHOOSE_ACTION');
  assert.equal(result.modelNumber, undefined);
});
