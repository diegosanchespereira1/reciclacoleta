import { CollectionItem, User, ReportFilters, ReportData } from '../types';
import { DatabaseService } from './database';
import { format, startOfDay, endOfDay } from 'date-fns';

export class ReportService {
  static generateReport(filters: ReportFilters, userRole: 'admin' | 'collector', userId?: string): ReportData {
    let collections = DatabaseService.getCollections();
    
    // Se for coletor, filtrar apenas suas próprias coletas
    if (userRole === 'collector' && userId) {
      collections = collections.filter(collection => collection.collectorId === userId);
    }

    // Aplicar filtros
    collections = this.applyFilters(collections, filters);

    // Calcular estatísticas
    const totalCollections = collections.length;
    const totalWeight = collections.reduce((sum, collection) => sum + collection.weight, 0);

    // Coletas por tipo
    const collectionsByType: Record<string, number> = {};
    const weightByType: Record<string, number> = {};
    collections.forEach(collection => {
      collectionsByType[collection.type] = (collectionsByType[collection.type] || 0) + 1;
      weightByType[collection.type] = (weightByType[collection.type] || 0) + collection.weight;
    });

    // Coletas por status
    const collectionsByStatus: Record<string, number> = {};
    collections.forEach(collection => {
      collectionsByStatus[collection.status] = (collectionsByStatus[collection.status] || 0) + 1;
    });

    // Coletas por coletor
    const collectionsByCollector: Record<string, { name: string; count: number; weight: number }> = {};
    collections.forEach(collection => {
      if (!collectionsByCollector[collection.collectorId]) {
        collectionsByCollector[collection.collectorId] = {
          name: collection.collectorName,
          count: 0,
          weight: 0
        };
      }
      collectionsByCollector[collection.collectorId].count += 1;
      collectionsByCollector[collection.collectorId].weight += collection.weight;
    });

    // Coletas por localização
    const collectionsByLocation: Record<string, number> = {};
    collections.forEach(collection => {
      collectionsByLocation[collection.location] = (collectionsByLocation[collection.location] || 0) + 1;
    });

    // Coletas diárias
    const dailyCollections = this.calculateDailyCollections(collections);
    
    // Tendências mensais
    const monthlyTrends = this.calculateMonthlyTrends(collections);

    return {
      totalCollections,
      totalWeight,
      collectionsByType,
      weightByType,
      collectionsByStatus,
      collectionsByCollector,
      collectionsByLocation,
      dailyCollections,
      monthlyTrends
    };
  }

  static getCollectors(): User[] {
    const users = DatabaseService.getUsers();
    return users.filter(user => user.role === 'collector');
  }

  static getLocations(): string[] {
    const collections = DatabaseService.getCollections();
    const locations = new Set(collections.map(collection => collection.location));
    return Array.from(locations).sort();
  }

  private static applyFilters(collections: CollectionItem[], filters: ReportFilters): CollectionItem[] {
    let filtered = [...collections];

    // Filtro por data
    if (filters.startDate) {
      const startDate = startOfDay(filters.startDate);
      filtered = filtered.filter(collection => 
        collection.collectedAt >= startDate
      );
    }

    if (filters.endDate) {
      const endDate = endOfDay(filters.endDate);
      filtered = filtered.filter(collection => 
        collection.collectedAt <= endDate
      );
    }

    // Filtro por coletor
    if (filters.collectorId) {
      filtered = filtered.filter(collection => 
        collection.collectorId === filters.collectorId
      );
    }

    // Filtro por tipo de material
    if (filters.materialType) {
      filtered = filtered.filter(collection => 
        collection.type === filters.materialType
      );
    }

    // Filtro por status
    if (filters.status) {
      filtered = filtered.filter(collection => 
        collection.status === filters.status
      );
    }

    // Filtro por localização
    if (filters.location) {
      filtered = filtered.filter(collection => 
        collection.location.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    return filtered;
  }

  private static calculateDailyCollections(collections: CollectionItem[]) {
    const dailyMap: Record<string, { count: number; weight: number }> = {};
    
    collections.forEach(collection => {
      const date = format(collection.collectedAt, 'yyyy-MM-dd');
      if (!dailyMap[date]) {
        dailyMap[date] = { count: 0, weight: 0 };
      }
      dailyMap[date].count += 1;
      dailyMap[date].weight += collection.weight;
    });

    return Object.entries(dailyMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private static calculateMonthlyTrends(collections: CollectionItem[]) {
    const monthlyMap: Record<string, { count: number; weight: number }> = {};
    
    collections.forEach(collection => {
      const month = format(collection.collectedAt, 'yyyy-MM');
      if (!monthlyMap[month]) {
        monthlyMap[month] = { count: 0, weight: 0 };
      }
      monthlyMap[month].count += 1;
      monthlyMap[month].weight += collection.weight;
    });

    return Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  static getMaterialTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'papel': 'Papel',
      'plastico': 'Plástico',
      'vidro': 'Vidro',
      'metal': 'Metal',
      'organico': 'Orgânico'
    };
    return labels[type] || type;
  }

  static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'collected': 'Coletado',
      'processed': 'Processado',
      'disposed': 'Descartado'
    };
    return labels[status] || status;
  }

  static getChartColors(): string[] {
    return [
      '#2e7d32', // Verde principal
      '#4caf50', // Verde claro
      '#ff9800', // Laranja
      '#2196f3', // Azul
      '#9c27b0', // Roxo
      '#f44336', // Vermelho
      '#00bcd4', // Ciano
      '#795548', // Marrom
      '#607d8b', // Azul acinzentado
      '#ffc107'  // Âmbar
    ];
  }
}
