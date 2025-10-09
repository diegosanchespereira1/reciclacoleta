export interface User {
  id: string;
  email: string;
  password: string;
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
