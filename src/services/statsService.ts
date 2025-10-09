import { CollectionStats } from '../types';
import { DatabaseService } from './database';

export class StatsService {
  static getCollectionStats(): CollectionStats {
    const collections = DatabaseService.getCollections();
    
    const totalItems = collections.length;
    const totalWeight = collections.reduce((sum, item) => sum + item.weight, 0);
    
    const itemsByType: Record<string, number> = {};
    const weightByType: Record<string, number> = {};
    
    collections.forEach(item => {
      itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
      weightByType[item.type] = (weightByType[item.type] || 0) + item.weight;
    });
    
    const recentCollections = collections
      .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
      .slice(0, 5);
    
    return {
      totalItems,
      totalWeight,
      itemsByType,
      weightByType,
      recentCollections
    };
  }

  static getCollectorStats(collectorId: string): CollectionStats {
    const collections = DatabaseService.getCollectionsByCollector(collectorId);
    
    const totalItems = collections.length;
    const totalWeight = collections.reduce((sum, item) => sum + item.weight, 0);
    
    const itemsByType: Record<string, number> = {};
    const weightByType: Record<string, number> = {};
    
    collections.forEach(item => {
      itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
      weightByType[item.type] = (weightByType[item.type] || 0) + item.weight;
    });
    
    const recentCollections = collections
      .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
      .slice(0, 5);
    
    return {
      totalItems,
      totalWeight,
      itemsByType,
      weightByType,
      recentCollections
    };
  }
}
