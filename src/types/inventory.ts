export type StockMovementType = 'Stock In' | 'Stock Out';

export type StockCategory = 'Motors / Pumps' | 'Spare Parts' | 'Service';

export type PhaseType = '1 PH' | '3 PH' | 'NA';

export interface StockEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: StockMovementType;
  category: StockCategory;
  modelName: string;
  modelNumber: string;
  serialNumber: string;
  hp: string;
  phase: PhaseType;
  kw: string;
  quantity: number;
  party: string;
  invoiceNumber: string;
  photo: string;
  remarks: string;
  createdAt: string; // ISO timestamp
}

export interface ModelSummary {
  modelNumber: string;
  modelName?: string;
  category: StockCategory;
  hp?: string;
  phase?: PhaseType;
  kw?: string;
  stockInTotal: number;
  stockOutTotal: number;
  currentBalance: number;
  lastMovementDate?: string;
  activeSerialNumbers: string[];
}

export interface FilterCriteria {
  searchQuery: string;
  movementType?: 'All' | StockMovementType;
  category?: 'All' | StockCategory;
  phase?: 'All' | PhaseType;
  startDate?: string;
  endDate?: string;
  lowStockOnly?: boolean;
  hideRecycleBin?: boolean;
}

export interface FirebaseConfigInfo {
  projectId: string;
  collectionName: string;
  apiKey: string;
  adminEmail: string;
  defaultUserEmail: string;
  databasePath: string;
  authEndpoint: string;
  isVerified: boolean;
  connectionStatus: 'untested' | 'connected' | 'error' | 'local_demo';
  lastChecked?: string;
  errorMessage?: string;
  recordCount?: number;
}
