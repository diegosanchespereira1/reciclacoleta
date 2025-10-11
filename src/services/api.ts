import { CollectionItem, CollectionPoint, User, CollectionStats, ReportData, TrackingEvent } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    points: number;
    level: string;
    createdAt: string;
  };
  token: string;
}

interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  };
  token: string;
}

interface VerifyResponse {
  valid: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    points: number;
    level: string;
    createdAt: string;
  };
}

class ApiService {
  private token: string | null = localStorage.getItem('token');

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro de conexão' }));
      throw new Error(errorData.error || 'Login falhou');
    }
    
    const data: LoginResponse = await response.json();
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async register(email: string, password: string, name: string, role = 'collector'): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro de conexão' }));
      throw new Error(errorData.error || 'Registro falhou');
    }
    
    return response.json();
  }

  async verifyToken(): Promise<VerifyResponse | null> {
    if (!this.token) return null;
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      if (!response.ok) {
        this.logout();
        return null;
      }
      
      return response.json();
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      this.logout();
      return null;
    }
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  // Métodos para fazer requisições autenticadas
  async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Sessão expirada');
    }

    return response;
  }

  // Métodos para coletas
  async getCollections(): Promise<any> {
    const response = await this.authenticatedRequest('/collections');
    if (!response.ok) {
      throw new Error('Erro ao buscar coletas');
    }
    return response.json();
  }

  async createCollection(collectionData: any): Promise<any> {
    const response = await this.authenticatedRequest('/collections', {
      method: 'POST',
      body: JSON.stringify(collectionData),
    });
    if (!response.ok) {
      throw new Error('Erro ao criar coleta');
    }
    return response.json();
  }

  // Métodos para usuários
  async getUserProfile(): Promise<any> {
    const response = await this.authenticatedRequest('/users/profile');
    if (!response.ok) {
      throw new Error('Erro ao buscar perfil');
    }
    return response.json();
  }

  async getUserStats(): Promise<any> {
    const response = await this.authenticatedRequest('/users/stats');
    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas');
    }
    return response.json();
  }

  // Métodos para pontos de coleta
  async getCollectionPoints(): Promise<any> {
    const response = await this.authenticatedRequest('/collection-points');
    if (!response.ok) {
      throw new Error('Erro ao buscar pontos de coleta');
    }
    return response.json();
  }


  // Métodos para relatórios
  async getReportData(filters: any = {}): Promise<any> {
    const queryParams = new URLSearchParams(filters).toString();
    const url = `/reports/data${queryParams ? `?${queryParams}` : ''}`;
    const response = await this.authenticatedRequest(url);
    if (!response.ok) {
      throw new Error('Erro ao buscar dados do relatório');
    }
    return response.json();
  }

  async getDashboardData(): Promise<any> {
    const response = await this.authenticatedRequest('/reports/dashboard');
    if (!response.ok) {
      throw new Error('Erro ao buscar dados do dashboard');
    }
    return response.json();
  }

  async createCollectionPoint(pointData: any): Promise<CollectionPoint> {
    const response = await this.authenticatedRequest('/collection-points', {
      method: 'POST',
      body: JSON.stringify(pointData)
    });
    if (!response.ok) throw new Error('Failed to create collection point');
    return response.json();
  }

  async updateCollectionPoint(pointId: string, pointData: any): Promise<CollectionPoint> {
    const response = await this.authenticatedRequest(`/collection-points/${pointId}`, {
      method: 'PUT',
      body: JSON.stringify(pointData)
    });
    if (!response.ok) throw new Error('Failed to update collection point');
    return response.json();
  }

  async deleteCollectionPoint(pointId: string): Promise<void> {
    const response = await this.authenticatedRequest(`/collection-points/${pointId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete collection point');
  }
}

export default new ApiService();
