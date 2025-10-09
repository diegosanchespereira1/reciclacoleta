import { PointsSystem, UserPoints, PointsTransaction, CollectionItem } from '../types';
import { format } from 'date-fns';

export class PointsService {
  private static readonly STORAGE_KEY = 'recicla_coleta_points';
  private static readonly POINTS_SYSTEM_KEY = 'recicla_coleta_points_system';

  // Configuração do sistema de pontos por tipo de material
  private static readonly DEFAULT_POINTS_CONFIG: PointsSystem[] = [
    {
      materialType: 'papel',
      pointsPerKg: 10,
      bonusMultiplier: 1.2,
      description: 'Papel reciclável - 10 pontos/kg com bônus de 20%'
    },
    {
      materialType: 'plastico',
      pointsPerKg: 15,
      bonusMultiplier: 1.5,
      description: 'Plástico reciclável - 15 pontos/kg com bônus de 50%'
    },
    {
      materialType: 'vidro',
      pointsPerKg: 12,
      bonusMultiplier: 1.3,
      description: 'Vidro reciclável - 12 pontos/kg com bônus de 30%'
    },
    {
      materialType: 'metal',
      pointsPerKg: 20,
      bonusMultiplier: 2.0,
      description: 'Metal reciclável - 20 pontos/kg com bônus de 100%'
    },
    {
      materialType: 'organico',
      pointsPerKg: 5,
      bonusMultiplier: 1.1,
      description: 'Material orgânico - 5 pontos/kg com bônus de 10%'
    }
  ];

  // Inicializar sistema de pontos
  static initialize(): void {
    const stored = localStorage.getItem(this.POINTS_SYSTEM_KEY);
    if (!stored) {
      localStorage.setItem(this.POINTS_SYSTEM_KEY, JSON.stringify(this.DEFAULT_POINTS_CONFIG));
    }
  }

  // Obter configuração de pontos para um tipo de material
  static getPointsConfig(materialType: string): PointsSystem | null {
    this.initialize();
    const configs = this.getPointsConfigs();
    return configs.find(config => config.materialType === materialType) || null;
  }

  // Obter todas as configurações de pontos
  static getPointsConfigs(): PointsSystem[] {
    this.initialize();
    const stored = localStorage.getItem(this.POINTS_SYSTEM_KEY);
    return stored ? JSON.parse(stored) : this.DEFAULT_POINTS_CONFIG;
  }

  // Calcular pontos para uma coleta
  static calculatePoints(collection: CollectionItem): number {
    const config = this.getPointsConfig(collection.type);
    if (!config) return 0;

    const basePoints = collection.weight * config.pointsPerKg;
    const bonusPoints = basePoints * (config.bonusMultiplier - 1);
    
    return Math.round(basePoints + bonusPoints);
  }

  // Adicionar pontos ao usuário
  static async addPoints(
    userId: string,
    collection: CollectionItem,
    status: 'pending' | 'confirmed' = 'pending'
  ): Promise<PointsTransaction> {
    const points = this.calculatePoints(collection);
    
    const transaction: PointsTransaction = {
      id: crypto.randomUUID(),
      userId,
      collectionId: collection.id,
      materialType: collection.type,
      weight: collection.weight,
      points,
      timestamp: new Date(),
      status
    };

    // Adicionar transação ao histórico do usuário
    const userPoints = this.getUserPoints(userId);
    userPoints.transactions.push(transaction);
    userPoints.lastUpdated = new Date();

    // Atualizar totais se confirmado
    if (status === 'confirmed') {
      userPoints.totalPoints += points;
      
      // Atualizar pontos por material
      if (!userPoints.pointsByMaterial[collection.type]) {
        userPoints.pointsByMaterial[collection.type] = 0;
      }
      userPoints.pointsByMaterial[collection.type] += points;

      // Atualizar pontos por mês
      const monthKey = format(new Date(), 'yyyy-MM');
      if (!userPoints.pointsByMonth[monthKey]) {
        userPoints.pointsByMonth[monthKey] = 0;
      }
      userPoints.pointsByMonth[monthKey] += points;
    }

    this.saveUserPoints(userPoints);
    return transaction;
  }

  // Confirmar transação de pontos
  static confirmTransaction(transactionId: string): boolean {
    const users = this.getAllUsersPoints();
    let transaction: PointsTransaction | null = null;
    let userPoints: UserPoints | null = null;

    // Encontrar a transação
    for (const user of users) {
      const foundTransaction = user.transactions.find(t => t.id === transactionId);
      if (foundTransaction && foundTransaction.status === 'pending') {
        transaction = foundTransaction;
        userPoints = user;
        break;
      }
    }

    if (!transaction || !userPoints) return false;

    // Confirmar transação
    transaction.status = 'confirmed';
    userPoints.totalPoints += transaction.points;

    // Atualizar pontos por material
    if (!userPoints.pointsByMaterial[transaction.materialType]) {
      userPoints.pointsByMaterial[transaction.materialType] = 0;
    }
    userPoints.pointsByMaterial[transaction.materialType] += transaction.points;

    // Atualizar pontos por mês
    const monthKey = format(transaction.timestamp, 'yyyy-MM');
    if (!userPoints.pointsByMonth[monthKey]) {
      userPoints.pointsByMonth[monthKey] = 0;
    }
    userPoints.pointsByMonth[monthKey] += transaction.points;

    userPoints.lastUpdated = new Date();
    this.saveUserPoints(userPoints);
    return true;
  }

  // Cancelar transação de pontos
  static cancelTransaction(transactionId: string): boolean {
    const users = this.getAllUsersPoints();
    let transaction: PointsTransaction | null = null;
    let userPoints: UserPoints | null = null;

    // Encontrar a transação
    for (const user of users) {
      const foundTransaction = user.transactions.find(t => t.id === transactionId);
      if (foundTransaction && foundTransaction.status === 'pending') {
        transaction = foundTransaction;
        userPoints = user;
        break;
      }
    }

    if (!transaction || !userPoints) return false;

    transaction.status = 'cancelled';
    userPoints.lastUpdated = new Date();
    this.saveUserPoints(userPoints);
    return true;
  }

  // Obter pontos do usuário
  static getUserPoints(userId: string): UserPoints {
    const allUsers = this.getAllUsersPoints();
    let userPoints = allUsers.find(user => user.userId === userId);

    if (!userPoints) {
      userPoints = {
        userId,
        totalPoints: 0,
        pointsByMaterial: {},
        pointsByMonth: {},
        lastUpdated: new Date(),
        transactions: []
      };
    }

    return userPoints;
  }

  // Obter todos os usuários com pontos
  static getAllUsersPoints(): UserPoints[] {
    this.initialize();
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Salvar pontos do usuário
  private static saveUserPoints(userPoints: UserPoints): void {
    const allUsers = this.getAllUsersPoints();
    const index = allUsers.findIndex(user => user.userId === userPoints.userId);
    
    if (index >= 0) {
      allUsers[index] = userPoints;
    } else {
      allUsers.push(userPoints);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allUsers));
  }

  // Obter ranking de usuários
  static getUserRanking(limit: number = 10): Array<{
    userId: string;
    totalPoints: number;
    position: number;
    pointsByMaterial: Record<string, number>;
  }> {
    const allUsers = this.getAllUsersPoints();
    
    return allUsers
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit)
      .map((user, index) => ({
        userId: user.userId,
        totalPoints: user.totalPoints,
        position: index + 1,
        pointsByMaterial: user.pointsByMaterial
      }));
  }

  // Obter estatísticas de pontos
  static getPointsStats(): {
    totalPointsDistributed: number;
    totalTransactions: number;
    pendingTransactions: number;
    confirmedTransactions: number;
    averagePointsPerTransaction: number;
    pointsByMaterial: Record<string, number>;
    pointsByMonth: Record<string, number>;
  } {
    const allUsers = this.getAllUsersPoints();
    
    let totalPointsDistributed = 0;
    let totalTransactions = 0;
    let pendingTransactions = 0;
    let confirmedTransactions = 0;
    let pointsByMaterial: Record<string, number> = {};
    let pointsByMonth: Record<string, number> = {};

    allUsers.forEach(user => {
      totalPointsDistributed += user.totalPoints;
      
      user.transactions.forEach(transaction => {
        totalTransactions++;
        
        if (transaction.status === 'pending') pendingTransactions++;
        if (transaction.status === 'confirmed') confirmedTransactions++;

        if (transaction.status === 'confirmed') {
          // Pontos por material
          if (!pointsByMaterial[transaction.materialType]) {
            pointsByMaterial[transaction.materialType] = 0;
          }
          pointsByMaterial[transaction.materialType] += transaction.points;

          // Pontos por mês
          const monthKey = format(transaction.timestamp, 'yyyy-MM');
          if (!pointsByMonth[monthKey]) {
            pointsByMonth[monthKey] = 0;
          }
          pointsByMonth[monthKey] += transaction.points;
        }
      });
    });

    const averagePointsPerTransaction = totalTransactions > 0 
      ? totalPointsDistributed / confirmedTransactions 
      : 0;

    return {
      totalPointsDistributed,
      totalTransactions,
      pendingTransactions,
      confirmedTransactions,
      averagePointsPerTransaction,
      pointsByMaterial,
      pointsByMonth
    };
  }

  // Obter histórico de transações do usuário
  static getUserTransactionHistory(
    userId: string, 
    limit: number = 50
  ): PointsTransaction[] {
    const userPoints = this.getUserPoints(userId);
    
    return userPoints.transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Calcular nível do usuário baseado nos pontos
  static getUserLevel(totalPoints: number): {
    level: number;
    levelName: string;
    pointsToNextLevel: number;
    progressPercentage: number;
  } {
    const levels = [
      { min: 0, max: 99, name: 'Iniciante', points: 100 },
      { min: 100, max: 499, name: 'Reciclador', points: 500 },
      { min: 500, max: 999, name: 'Consciente', points: 1000 },
      { min: 1000, max: 2499, name: 'Sustentável', points: 2500 },
      { min: 2500, max: 4999, name: 'Ecológico', points: 5000 },
      { min: 5000, max: 9999, name: 'Ambientalista', points: 10000 },
      { min: 10000, max: 19999, name: 'Defensor da Natureza', points: 20000 },
      { min: 20000, max: Infinity, name: 'Lenda Verde', points: Infinity }
    ];

    const currentLevel = levels.find(level => 
      totalPoints >= level.min && totalPoints <= level.max
    ) || levels[0];

    const nextLevel = levels[levels.indexOf(currentLevel) + 1];
    const pointsToNextLevel = nextLevel ? nextLevel.min - totalPoints : 0;
    const progressPercentage = nextLevel 
      ? ((totalPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
      : 100;

    return {
      level: levels.indexOf(currentLevel) + 1,
      levelName: currentLevel.name,
      pointsToNextLevel,
      progressPercentage
    };
  }

  // Exportar dados de pontos para auditoria
  static exportPointsData(): string {
    const allUsers = this.getAllUsersPoints();
    const stats = this.getPointsStats();
    const configs = this.getPointsConfigs();

    return JSON.stringify({
      users: allUsers,
      stats,
      configs,
      exportDate: new Date().toISOString()
    }, null, 2);
  }
}

