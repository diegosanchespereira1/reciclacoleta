import { User, CollectionItem } from '../types';

const DB_PREFIX = 'recicla_coleta_';

export class DatabaseService {
  // User operations
  static async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    users.push(newUser);
    localStorage.setItem(`${DB_PREFIX}users`, JSON.stringify(users));
    return newUser;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const users = this.getUsers();
    return users.find(user => user.email === email) || null;
  }

  static getUsers(): User[] {
    const usersJson = localStorage.getItem(`${DB_PREFIX}users`);
    return usersJson ? JSON.parse(usersJson) : [];
  }

  // Collection operations
  static async createCollection(collection: Omit<CollectionItem, 'id' | 'collectedAt' | 'qrCode'>): Promise<CollectionItem> {
    const collections = this.getCollections();
    const newCollection: CollectionItem = {
      ...collection,
      id: crypto.randomUUID(),
      collectedAt: new Date(),
      qrCode: crypto.randomUUID(),
    };
    
    collections.push(newCollection);
    localStorage.setItem(`${DB_PREFIX}collections`, JSON.stringify(collections));
    return newCollection;
  }

  static getCollections(): CollectionItem[] {
    const collectionsJson = localStorage.getItem(`${DB_PREFIX}collections`);
    return collectionsJson ? JSON.parse(collectionsJson) : [];
  }

  static getCollectionsByCollector(collectorId: string): CollectionItem[] {
    const collections = this.getCollections();
    return collections.filter(collection => collection.collectorId === collectorId);
  }

  static async updateCollectionStatus(id: string, status: CollectionItem['status']): Promise<void> {
    const collections = this.getCollections();
    const index = collections.findIndex(collection => collection.id === id);
    if (index !== -1) {
      collections[index].status = status;
      localStorage.setItem(`${DB_PREFIX}collections`, JSON.stringify(collections));
    }
  }

  // Initialize sample data
  static initializeSampleData(): void {
    if (this.getUsers().length === 0) {
      this.createUser({
        email: 'admin@recicla.com',
        password: 'admin123',
        name: 'Administrador',
        role: 'admin'
      });

      this.createUser({
        email: 'coletor@recicla.com',
        password: 'coletor123',
        name: 'João Coletor',
        role: 'collector'
      });
    }

    if (this.getCollections().length === 0) {
      const adminUser = this.getUsers().find(u => u.role === 'admin');
      const collectorUser = this.getUsers().find(u => u.role === 'collector');
      
      if (adminUser && collectorUser) {
        // Sample collections
        this.createCollection({
          type: 'papel',
          weight: 15.5,
          location: 'Centro - São Paulo',
          collectionPointId: 'sample-point-1',
          collectionPointName: 'Ponto de Coleta Centro',
          collectorId: collectorUser.id,
          collectorName: collectorUser.name,
          status: 'collected'
        });

        this.createCollection({
          type: 'plastico',
          weight: 8.2,
          location: 'Vila Madalena - São Paulo',
          collectionPointId: 'sample-point-2',
          collectionPointName: 'Ponto de Coleta Vila Madalena',
          collectorId: collectorUser.id,
          collectorName: collectorUser.name,
          status: 'processed'
        });

        this.createCollection({
          type: 'vidro',
          weight: 12.0,
          location: 'Jardins - São Paulo',
          collectionPointId: 'sample-point-3',
          collectionPointName: 'Ponto de Coleta Jardins',
          collectorId: collectorUser.id,
          collectorName: collectorUser.name,
          status: 'disposed'
        });
      }
    }
  }
}
