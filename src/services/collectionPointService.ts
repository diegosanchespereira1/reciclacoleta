import { CollectionPoint } from '../types';

const DB_PREFIX = 'recicla_coleta_';

export class CollectionPointService {
  // Collection Point operations
  static async createCollectionPoint(point: Omit<CollectionPoint, 'id' | 'createdAt'>): Promise<CollectionPoint> {
    const points = this.getCollectionPoints();
    const newPoint: CollectionPoint = {
      ...point,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    points.push(newPoint);
    localStorage.setItem(`${DB_PREFIX}collection_points`, JSON.stringify(points));
    return newPoint;
  }

  static getCollectionPoints(): CollectionPoint[] {
    const pointsJson = localStorage.getItem(`${DB_PREFIX}collection_points`);
    return pointsJson ? JSON.parse(pointsJson) : [];
  }

  static getActiveCollectionPoints(): CollectionPoint[] {
    const points = this.getCollectionPoints();
    return points.filter(point => point.isActive);
  }

  static async updateCollectionPoint(id: string, updates: Partial<CollectionPoint>): Promise<void> {
    const points = this.getCollectionPoints();
    const index = points.findIndex(point => point.id === id);
    if (index !== -1) {
      points[index] = { ...points[index], ...updates };
      localStorage.setItem(`${DB_PREFIX}collection_points`, JSON.stringify(points));
    }
  }

  static async deleteCollectionPoint(id: string): Promise<void> {
    const points = this.getCollectionPoints();
    const filteredPoints = points.filter(point => point.id !== id);
    localStorage.setItem(`${DB_PREFIX}collection_points`, JSON.stringify(filteredPoints));
  }

  // Initialize sample data
  static initializeSampleData(): void {
    if (this.getCollectionPoints().length === 0) {
      this.createCollectionPoint({
        name: 'Ponto de Coleta Centro',
        responsibleName: 'Maria Silva',
        phone: '(11) 99999-9999',
        email: 'maria@centro.com',
        address: 'Rua das Flores, 123 - Centro',
        city: 'São Paulo - SP',
        latitude: -23.5505,
        longitude: -46.6333,
        isActive: true
      });

      this.createCollectionPoint({
        name: 'Ponto de Coleta Vila Madalena',
        responsibleName: 'João Santos',
        phone: '(11) 88888-8888',
        email: 'joao@vila.com',
        address: 'Rua Harmonia, 456 - Vila Madalena',
        city: 'São Paulo - SP',
        latitude: -23.5489,
        longitude: -46.6888,
        isActive: true
      });

      this.createCollectionPoint({
        name: 'Ponto de Coleta Jardins',
        responsibleName: 'Ana Costa',
        phone: '(11) 77777-7777',
        email: 'ana@jardins.com',
        address: 'Alameda Santos, 789 - Jardins',
        city: 'São Paulo - SP',
        latitude: -23.5613,
        longitude: -46.6565,
        isActive: true
      });
    }
  }

  // Geolocation service
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number; address: string; city: string } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Using a simple reverse geocoding service (you can replace with a more robust one)
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
            );
            const data = await response.json();
            
            resolve({
              latitude,
              longitude,
              address: data.localityInfo?.administrative?.[0]?.name || 'Endereço não encontrado',
              city: `${data.city || 'Cidade'}, ${data.principalSubdivision || 'Estado'}`
            });
          } catch (error) {
            resolve({
              latitude,
              longitude,
              address: 'Endereço não encontrado',
              city: 'Cidade não encontrada'
            });
          }
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          resolve(null);
        }
      );
    });
  }
}
