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

// Get all collections (admin) or user's collections (collector)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { page = 1, limit = 50, type, status } = req.query;

    const where = {};
    
    // Se for coletor, só ver suas próprias coletas
    if (role === 'collector') {
      where.collectorId = userId;
    }

    // Filtros opcionais
    if (type) where.type = type;
    if (status) where.status = status;

    const collections = await prisma.collectionItem.findMany({
      where,
      include: {
        collector: {
          select: { id: true, name: true, email: true }
        },
        collectionPoint: {
          select: { id: true, name: true, address: true }
        },
        trackingHistory: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { collectedAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.collectionItem.count({ where });

    res.json({
      collections,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar coletas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get collection by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const collection = await prisma.collectionItem.findUnique({
      where: { id },
      include: {
        collector: {
          select: { id: true, name: true, email: true }
        },
        collectionPoint: {
          select: { id: true, name: true, address: true }
        },
        trackingHistory: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!collection) {
      return res.status(404).json({ error: 'Coleta não encontrada' });
    }

    // Se for coletor, só pode ver suas próprias coletas
    if (role === 'collector' && collection.collectorId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json(collection);

  } catch (error) {
    console.error('Erro ao buscar coleta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create new collection
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const {
      type,
      weight,
      location,
      collectionPointId,
      collectionPointName,
      status = 'collected',
      photoUrl,
      photoHash,
      blockchainHash
    } = req.body;

    // Validações
    if (!type || !weight || !location) {
      return res.status(400).json({ 
        error: 'Tipo, peso e localização são obrigatórios' 
      });
    }

    const validTypes = ['papel', 'plastico', 'vidro', 'metal', 'organico'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Tipo de material inválido' 
      });
    }

    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar ponto de coleta se fornecido
    let collectionPoint = null;
    if (collectionPointId) {
      collectionPoint = await prisma.collectionPoint.findUnique({
        where: { id: collectionPointId }
      });
    }

    // Gerar IDs únicos
    const trackingId = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calcular pontos baseado no tipo e peso
    const pointsMultiplier = {
      'papel': 10,
      'plastico': 15,
      'vidro': 12,
      'metal': 20,
      'organico': 5
    };

    const bonusMultiplier = {
      'papel': 1.2,
      'plastico': 1.5,
      'vidro': 1.3,
      'metal': 2.0,
      'organico': 1.1
    };

    const basePoints = Math.floor(weight * pointsMultiplier[type]);
    const points = Math.floor(basePoints * bonusMultiplier[type]);

    // Criar coleta
    const collection = await prisma.collectionItem.create({
      data: {
        type,
        weight,
        location,
        collectionPointId: collectionPoint?.id,
        collectionPointName: collectionPoint?.name || collectionPointName,
        collectorId: userId,
        collectorName: user.name,
        status,
        qrCode,
        trackingId,
        photoUrl,
        photoHash,
        blockchainHash,
        points
      },
      include: {
        collector: {
          select: { id: true, name: true, email: true }
        },
        collectionPoint: {
          select: { id: true, name: true, address: true }
        }
      }
    });

    // Criar evento de tracking inicial
    await prisma.trackingEvent.create({
      data: {
        collectionId: collection.id,
        stage: 'collected',
        location,
        responsiblePerson: user.name,
        responsiblePersonId: userId,
        notes: `Coleta inicial registrada por ${user.name}`,
        photoUrl,
        photoHash,
        weight
      }
    });

    // Atualizar pontos do usuário
    await prisma.userPoints.upsert({
      where: { userId },
      update: {
        totalPoints: { increment: points },
        level: getLevelFromPoints((await prisma.userPoints.findUnique({
          where: { userId }
        }))?.totalPoints || 0 + points)
      },
      create: {
        userId,
        totalPoints: points,
        level: getLevelFromPoints(points)
      }
    });

    // Criar transação de pontos
    await prisma.pointsTransaction.create({
      data: {
        userId,
        collectionId: collection.id,
        points,
        type: 'earned',
        description: `Coleta de ${weight}kg de ${type}`
      }
    });

    res.status(201).json({
      message: 'Coleta criada com sucesso',
      collection,
      points
    });

  } catch (error) {
    console.error('Erro ao criar coleta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update collection
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const updateData = req.body;

    // Verificar se a coleta existe
    const existingCollection = await prisma.collectionItem.findUnique({
      where: { id }
    });

    if (!existingCollection) {
      return res.status(404).json({ error: 'Coleta não encontrada' });
    }

    // Se for coletor, só pode editar suas próprias coletas
    if (role === 'collector' && existingCollection.collectorId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Remover campos que não devem ser atualizados diretamente
    delete updateData.id;
    delete updateData.collectorId;
    delete updateData.createdAt;

    const collection = await prisma.collectionItem.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        collector: {
          select: { id: true, name: true, email: true }
        },
        collectionPoint: {
          select: { id: true, name: true, address: true }
        },
        trackingHistory: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    res.json({
      message: 'Coleta atualizada com sucesso',
      collection
    });

  } catch (error) {
    console.error('Erro ao atualizar coleta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Add tracking event
router.post('/:id/tracking', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;
    const {
      stage,
      location,
      notes,
      photoUrl,
      photoHash,
      blockchainHash,
      weight
    } = req.body;

    // Verificar se a coleta existe
    const collection = await prisma.collectionItem.findUnique({
      where: { id }
    });

    if (!collection) {
      return res.status(404).json({ error: 'Coleta não encontrada' });
    }

    // Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Criar evento de tracking
    const trackingEvent = await prisma.trackingEvent.create({
      data: {
        collectionId: id,
        stage,
        location,
        responsiblePerson: user.name,
        responsiblePersonId: userId,
        notes,
        photoUrl,
        photoHash,
        blockchainHash,
        weight: weight || collection.weight
      }
    });

    res.status(201).json({
      message: 'Evento de rastreamento adicionado com sucesso',
      trackingEvent
    });

  } catch (error) {
    console.error('Erro ao adicionar evento de tracking:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Approve collection - change status from awaiting_approval to completed
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'ID de coleta inválido' });
    }

    // Only admins can approve collections
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem aprovar coletas' });
    }

    // Verificar se a coleta existe
    const collection = await prisma.collectionItem.findUnique({
      where: { id }
    });

    if (!collection) {
      return res.status(404).json({ error: 'Coleta não encontrada' });
    }

    // Verificar se a coleta está aguardando aprovação
    if (collection.status !== 'awaiting_approval') {
      return res.status(400).json({ 
        error: 'Coleta não está aguardando aprovação',
        currentStatus: collection.status
      });
    }

    // Atualizar status para completed
    // O trigger auto_credit_on_completion será executado automaticamente
    const updatedCollection = await prisma.collectionItem.update({
      where: { id },
      data: {
        status: 'completed',
        updatedAt: new Date()
      },
      include: {
        collector: {
          select: { id: true, name: true, email: true }
        },
        collectionPoint: {
          select: { id: true, name: true, address: true }
        },
        trackingHistory: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    // Buscar pontos atualizados do usuário
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: collection.collectorId }
    });

    // Criar evento de tracking para a aprovação
    await prisma.trackingEvent.create({
      data: {
        collectionId: id,
        stage: 'completed',
        location: collection.location,
        responsiblePerson: req.user.name || 'Administrador',
        responsiblePersonId: userId,
        notes: `Coleta aprovada e concluída. Crédito de ${collection.points} pontos concedido automaticamente.`,
        weight: collection.weight
      }
    });

    res.json({
      message: 'Coleta aprovada com sucesso',
      collection: updatedCollection,
      pointsGranted: collection.points,
      userTotalPoints: userPoints?.totalPoints || 0
    });

  } catch (error) {
    console.error('Erro ao aprovar coleta:', error);
    // Don't expose internal error details to client
    res.status(500).json({ 
      error: 'Erro interno do servidor'
    });
  }
});

// Helper function to determine user level based on points
function getLevelFromPoints(points) {
  if (points >= 10000) return 'Lenda Verde';
  if (points >= 5000) return 'Mestre Reciclador';
  if (points >= 2500) return 'Especialista';
  if (points >= 1000) return 'Avançado';
  if (points >= 500) return 'Intermediário';
  if (points >= 100) return 'Iniciante';
  return 'Novato';
}

module.exports = router;
