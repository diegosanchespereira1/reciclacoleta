import { BlockchainRecord } from '../types';

export class BlockchainService {
  private static blockchain: BlockchainRecord[] = [];
  private static readonly STORAGE_KEY = 'recicla_coleta_blockchain';

  // Inicializar blockchain
  static initialize(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.blockchain = JSON.parse(stored);
    } else {
      // Criar bloco gênese
      this.createGenesisBlock();
    }
  }

  // Criar bloco gênese
  private static createGenesisBlock(): void {
    const genesisBlock: BlockchainRecord = {
      hash: this.calculateHashSync('', {
        collectionId: 'genesis',
        eventId: 'genesis',
        stage: 'genesis',
        weight: 0,
        location: 'Sistema',
        responsiblePerson: 'Sistema',
        photoHash: undefined
      }, 0, new Date()),
      timestamp: new Date(),
      data: {
        collectionId: 'genesis',
        eventId: 'genesis',
        stage: 'genesis',
        weight: 0,
        location: 'Sistema',
        responsiblePerson: 'Sistema',
        photoHash: undefined
      },
      nonce: 0
    };

    this.blockchain = [genesisBlock];
    this.saveBlockchain();
  }

  // Calcular hash SHA-256 usando Web Crypto API
  private static async calculateHash(
    previousHash: string,
    data: any,
    nonce: number,
    timestamp: Date
  ): Promise<string> {
    const input = `${previousHash}${JSON.stringify(data)}${nonce}${timestamp.getTime()}`;
    const encoder = new TextEncoder();
    const data_buffer = encoder.encode(input);
    const hash_buffer = await crypto.subtle.digest('SHA-256', data_buffer);
    const hash_array = Array.from(new Uint8Array(hash_buffer));
    const hash_hex = hash_array.map(b => b.toString(16).padStart(2, '0')).join('');
    return hash_hex;
  }

  // Versão síncrona para compatibilidade (usando hash simples)
  private static calculateHashSync(
    previousHash: string,
    data: any,
    nonce: number,
    timestamp: Date
  ): string {
    const input = `${previousHash}${JSON.stringify(data)}${nonce}${timestamp.getTime()}`;
    let hash = 0;
    if (input.length === 0) return hash.toString();
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  // Mineração (Proof of Work simplificado)
  private static mineBlock(previousHash: string, data: any, timestamp: Date): BlockchainRecord {
    let nonce = 0;
    let hash = this.calculateHashSync(previousHash, data, nonce, timestamp);

    // Simular mineração com dificuldade baixa (2 zeros no início)
    while (!hash.startsWith('00')) {
      nonce++;
      hash = this.calculateHashSync(previousHash, data, nonce, timestamp);
    }

    return {
      hash,
      previousHash,
      timestamp,
      data,
      nonce
    };
  }

  // Adicionar novo registro ao blockchain
  static async addRecord(
    collectionId: string,
    eventId: string,
    stage: string,
    weight: number,
    location: string,
    responsiblePerson: string,
    photoHash?: string
  ): Promise<string> {
    this.initialize();

    const previousBlock = this.blockchain[this.blockchain.length - 1];
    const previousHash = previousBlock.hash;
    const timestamp = new Date();

    const data = {
      collectionId,
      eventId,
      stage,
      weight,
      location,
      responsiblePerson,
      photoHash
    };

    const newBlock = this.mineBlock(previousHash, data, timestamp);
    this.blockchain.push(newBlock);
    this.saveBlockchain();

    return newBlock.hash;
  }

  // Verificar integridade do blockchain
  static verifyBlockchain(): { isValid: boolean; errors: string[] } {
    this.initialize();
    const errors: string[] = [];

    for (let i = 1; i < this.blockchain.length; i++) {
      const currentBlock = this.blockchain[i];
      const previousBlock = this.blockchain[i - 1];

      // Verificar hash anterior
      if (currentBlock.previousHash !== previousBlock.hash) {
        errors.push(`Block ${i}: Previous hash mismatch`);
      }

      // Verificar hash atual
      const calculatedHash = this.calculateHashSync(
        currentBlock.previousHash || '',
        currentBlock.data,
        currentBlock.nonce,
        currentBlock.timestamp
      );

      if (calculatedHash !== currentBlock.hash) {
        errors.push(`Block ${i}: Hash mismatch`);
      }

      // Verificar se o hash atende à dificuldade
      if (!currentBlock.hash.startsWith('00')) {
        errors.push(`Block ${i}: Hash does not meet difficulty requirement`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Buscar registros por ID da coleta
  static getRecordsByCollectionId(collectionId: string): BlockchainRecord[] {
    this.initialize();
    return this.blockchain.filter(block => 
      block.data.collectionId === collectionId && block.data.collectionId !== 'genesis'
    );
  }

  // Buscar registros por hash
  static getRecordByHash(hash: string): BlockchainRecord | null {
    this.initialize();
    return this.blockchain.find(block => block.hash === hash) || null;
  }

  // Obter histórico completo do blockchain
  static getFullHistory(): BlockchainRecord[] {
    this.initialize();
    return [...this.blockchain];
  }

  // Obter estatísticas do blockchain
  static getBlockchainStats(): {
    totalBlocks: number;
    totalCollections: number;
    lastBlockTime: Date | null;
    averageBlockTime: number;
  } {
    this.initialize();
    
    const totalBlocks = this.blockchain.length;
    const totalCollections = new Set(
      this.blockchain
        .filter(block => block.data.collectionId !== 'genesis')
        .map(block => block.data.collectionId)
    ).size;

    const lastBlockTime = totalBlocks > 1 ? this.blockchain[totalBlocks - 1].timestamp : null;
    
    let averageBlockTime = 0;
    if (totalBlocks > 2) {
      const firstTime = this.blockchain[1].timestamp.getTime();
      const lastTime = this.blockchain[totalBlocks - 1].timestamp.getTime();
      averageBlockTime = (lastTime - firstTime) / (totalBlocks - 2);
    }

    return {
      totalBlocks,
      totalCollections,
      lastBlockTime,
      averageBlockTime
    };
  }

  // Gerar hash de foto (simulado)
  static generatePhotoHash(photoData: string): string {
    let hash = 0;
    if (photoData.length === 0) return hash.toString();
    for (let i = 0; i < photoData.length; i++) {
      const char = photoData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  // Gerar ID único de rastreamento
  static generateTrackingId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `TRK-${timestamp}-${random}`.toUpperCase();
  }

  // Salvar blockchain no localStorage
  private static saveBlockchain(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.blockchain));
  }

  // Exportar blockchain para auditoria
  static exportBlockchain(): string {
    this.initialize();
    return JSON.stringify(this.blockchain, null, 2);
  }

  // Validar registro específico
  static validateRecord(hash: string): boolean {
    const record = this.getRecordByHash(hash);
    if (!record) return false;

    const calculatedHash = this.calculateHashSync(
      record.previousHash || '',
      record.data,
      record.nonce,
      record.timestamp
    );

    return calculatedHash === hash;
  }

  // Obter cadeia de custódia para uma coleta
  static getCustodyChain(collectionId: string): {
    isValid: boolean;
    chain: BlockchainRecord[];
    timeline: Array<{
      timestamp: Date;
      stage: string;
      location: string;
      responsiblePerson: string;
      hash: string;
    }>;
  } {
    const records = this.getRecordsByCollectionId(collectionId);
    
    // Ordenar por timestamp
    records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const timeline = records.map(record => ({
      timestamp: record.timestamp,
      stage: record.data.stage,
      location: record.data.location,
      responsiblePerson: record.data.responsiblePerson,
      hash: record.hash
    }));

    // Verificar se a cadeia está completa e válida
    const expectedStages = ['collected', 'processing', 'shipped_to_industry', 'completed'];
    const actualStages = timeline.map(t => t.stage);
    const hasAllStages = expectedStages.every(stage => actualStages.includes(stage));

    return {
      isValid: hasAllStages && records.every(record => this.validateRecord(record.hash)),
      chain: records,
      timeline
    };
  }
}
