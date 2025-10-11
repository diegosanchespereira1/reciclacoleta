export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: 'collector' | 'admin';
  createdAt: Date;
}

export interface CollectionItem {
  id: string;
  type: 'papel' | 'plastico' | 'vidro' | 'metal' | 'organico';
  weight: number;
  location: string;
  collectionPointId?: string;
  collectionPointName?: string;
  collectorId: string;
  collectorName: string;
  collectedAt: Date;
  status: 'collected' | 'processed' | 'disposed';
  qrCode: string;
  // Rastreamento e Blockchain
  blockchainHash?: string;
  trackingId: string;
  photoUrl?: string;
  photoHash?: string;
  points: number;
  // Histórico de rastreamento
  trackingHistory: TrackingEvent[];
}

export interface TrackingEvent {
  id: string;
  collectionId: string;
  stage: 'collected' | 'processing' | 'shipped_to_industry' | 'completed';
  timestamp: Date;
  location: string;
  responsiblePerson: string;
  responsiblePersonId: string;
  notes?: string;
  photoUrl?: string;
  photoHash?: string;
  blockchainHash?: string;
  weight?: number; // Peso no momento do evento
}

export interface BlockchainRecord {
  hash: string;
  previousHash?: string;
  timestamp: Date;
  data: {
    collectionId: string;
    eventId: string;
    stage: string;
    weight: number;
    location: string;
    responsiblePerson: string;
    photoHash?: string;
  };
  nonce: number;
}

export interface PointsSystem {
  materialType: 'papel' | 'plastico' | 'vidro' | 'metal' | 'organico';
  pointsPerKg: number;
  bonusMultiplier: number;
  description: string;
}

export interface UserPoints {
  userId: string;
  totalPoints: number;
  pointsByMaterial: Record<string, number>;
  pointsByMonth: Record<string, number>;
  lastUpdated: Date;
  transactions: PointsTransaction[];
}

export interface PointsTransaction {
  id: string;
  userId: string;
  collectionId: string;
  materialType: string;
  weight: number;
  points: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface CollectionStats {
  totalItems: number;
  totalWeight: number;
  itemsByType: Record<string, number>;
  weightByType: Record<string, number>;
  recentCollections: CollectionItem[];
}

export interface CollectionPoint {
  id: string;
  name: string;
  responsibleName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  isActive: boolean;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  collectorId?: string;
  materialType?: 'papel' | 'plastico' | 'vidro' | 'metal' | 'organico';
  status?: 'collected' | 'processed' | 'disposed';
  location?: string;
}

export interface ReportData {
  totalCollections: number;
  totalWeight: number;
  collectionsByType: Record<string, number>;
  weightByType: Record<string, number>;
  collectionsByStatus: Record<string, number>;
  collectionsByCollector: Record<string, { name: string; count: number; weight: number }>;
  collectionsByLocation: Record<string, number>;
  dailyCollections: Array<{ date: string; count: number; weight: number }>;
  monthlyTrends: Array<{ month: string; count: number; weight: number }>;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    borderWidth?: number;
  }>;
}

export interface ReportConfig {
  title: string;
  includeCharts: boolean;
  includeTables: boolean;
  includeCollectorDetails: boolean;
  includeLocationDetails: boolean;
  dateRange: {
    start: Date;
    end: Date;
  };
}