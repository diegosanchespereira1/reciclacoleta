const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';

// Middleware para verificar autenticação
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Add blockchain record
router.post('/record', authenticateToken, async (req, res) => {
  try {
    const {
      collectionId,
      eventId,
      stage,
      weight,
      location,
      responsiblePerson,
      photoHash
    } = req.body;

    // Validações
    if (!collectionId || !eventId || !stage || !weight || !location || !responsiblePerson) {
      return res.status(400).json({ 
        error: 'Todos os campos são obrigatórios' 
      });
    }

    // Verificar se a coleta existe
    const collection = await prisma.collectionItem.findUnique({
      where: { id: collectionId }
    });

    if (!collection) {
      return res.status(404).json({ error: 'Coleta não encontrada' });
    }

    // Buscar último registro para obter o hash anterior
    const lastRecord = await prisma.blockchainRecord.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    const previousHash = lastRecord?.hash || '0';

    // Gerar hash simples (simulação)
    const timestamp = new Date();
    const nonce = Math.floor(Math.random() * 1000000);
    const dataString = JSON.stringify({
      collectionId,
      eventId,
      stage,
      weight,
      location,
      responsiblePerson,
      photoHash,
      timestamp: timestamp.getTime(),
      nonce
    });

    // Hash simples usando timestamp e nonce
    const hash = generateSimpleHash(previousHash + dataString);

    // Criar registro blockchain
    const blockchainRecord = await prisma.blockchainRecord.create({
      data: {
        hash,
        previousHash,
        collectionId,
        eventId,
        stage,
        weight,
        location,
        responsiblePerson,
        photoHash,
        nonce
      }
    });

    res.status(201).json({
      message: 'Registro blockchain criado com sucesso',
      blockchainRecord
    });

  } catch (error) {
    console.error('Erro ao criar registro blockchain:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Validate blockchain record
router.get('/validate/:hash', authenticateToken, async (req, res) => {
  try {
    const { hash } = req.params;

    const record = await prisma.blockchainRecord.findUnique({
      where: { hash },
      include: {
        collection: {
          select: {
            id: true,
            type: true,
            weight: true,
            collectorName: true,
            collectedAt: true
          }
        }
      }
    });

    if (!record) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Registro não encontrado' 
      });
    }

    // Validar hash (simulação)
    const dataString = JSON.stringify({
      collectionId: record.collectionId,
      eventId: record.eventId,
      stage: record.stage,
      weight: record.weight,
      location: record.location,
      responsiblePerson: record.responsiblePerson,
      photoHash: record.photoHash,
      timestamp: record.timestamp.getTime(),
      nonce: record.nonce
    });

    const calculatedHash = generateSimpleHash(record.previousHash + dataString);
    const isValid = calculatedHash === hash;

    res.json({
      valid: isValid,
      record,
      calculatedHash,
      message: isValid ? 'Registro válido' : 'Registro inválido'
    });

  } catch (error) {
    console.error('Erro ao validar registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get blockchain chain
router.get('/chain', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, collectionId } = req.query;

    let whereClause = {};
    if (collectionId) {
      whereClause.collectionId = collectionId;
    }

    const records = await prisma.blockchainRecord.findMany({
      where: whereClause,
      include: {
        collection: {
          select: {
            id: true,
            type: true,
            weight: true,
            collectorName: true,
            collectedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    // Validar cadeia
    const validationResults = records.map((record, index) => {
      const dataString = JSON.stringify({
        collectionId: record.collectionId,
        eventId: record.eventId,
        stage: record.stage,
        weight: record.weight,
        location: record.location,
        responsiblePerson: record.responsiblePerson,
        photoHash: record.photoHash,
        timestamp: record.timestamp.getTime(),
        nonce: record.nonce
      });

      const calculatedHash = generateSimpleHash(record.previousHash + dataString);
      const isValid = calculatedHash === record.hash;

      return {
        ...record,
        isValid,
        calculatedHash
      };
    });

    res.json({
      records: validationResults,
      totalRecords: records.length,
      validRecords: validationResults.filter(r => r.isValid).length,
      invalidRecords: validationResults.filter(r => !r.isValid).length
    });

  } catch (error) {
    console.error('Erro ao buscar cadeia blockchain:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get blockchain statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [
      totalRecords,
      recordsByStage,
      recordsByCollection,
      recentRecords
    ] = await Promise.all([
      // Total de registros
      prisma.blockchainRecord.count(),

      // Registros por estágio
      prisma.blockchainRecord.groupBy({
        by: ['stage'],
        _count: { stage: true }
      }),

      // Registros por coleta
      prisma.blockchainRecord.groupBy({
        by: ['collectionId'],
        _count: { collectionId: true },
        orderBy: { _count: { collectionId: 'desc' } },
        take: 10
      }),

      // Registros recentes
      prisma.blockchainRecord.findMany({
        include: {
          collection: {
            select: {
              id: true,
              type: true,
              collectorName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    res.json({
      totalRecords,
      recordsByStage,
      recordsByCollection,
      recentRecords
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas blockchain:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Helper function to generate simple hash
function generateSimpleHash(input) {
  let hash = 0;
  if (input.length === 0) return hash.toString();
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}

module.exports = router;
