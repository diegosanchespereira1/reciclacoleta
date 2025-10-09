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

// Get all collection points
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { isActive, page = 1, limit = 50 } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const collectionPoints = await prisma.collectionPoint.findMany({
      where,
      include: {
        _count: {
          select: {
            collections: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    const total = await prisma.collectionPoint.count({ where });

    res.json({
      collectionPoints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar pontos de coleta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get collection point by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const collectionPoint = await prisma.collectionPoint.findUnique({
      where: { id },
      include: {
        collections: {
          include: {
            collector: {
              select: { name: true, email: true }
            }
          },
          orderBy: { collectedAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            collections: true
          }
        }
      }
    });

    if (!collectionPoint) {
      return res.status(404).json({ error: 'Ponto de coleta não encontrado' });
    }

    res.json(collectionPoint);

  } catch (error) {
    console.error('Erro ao buscar ponto de coleta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create collection point (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { name, address, latitude, longitude, isActive = true } = req.body;

    // Validações
    if (!name || !address) {
      return res.status(400).json({ 
        error: 'Nome e endereço são obrigatórios' 
      });
    }

    const collectionPoint = await prisma.collectionPoint.create({
      data: {
        name,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isActive
      }
    });

    res.status(201).json({
      message: 'Ponto de coleta criado com sucesso',
      collectionPoint
    });

  } catch (error) {
    console.error('Erro ao criar ponto de coleta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update collection point (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { name, address, latitude, longitude, isActive } = req.body;

    // Verificar se o ponto existe
    const existingPoint = await prisma.collectionPoint.findUnique({
      where: { id }
    });

    if (!existingPoint) {
      return res.status(404).json({ error: 'Ponto de coleta não encontrado' });
    }

    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    updateData.updatedAt = new Date();

    const collectionPoint = await prisma.collectionPoint.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Ponto de coleta atualizado com sucesso',
      collectionPoint
    });

  } catch (error) {
    console.error('Erro ao atualizar ponto de coleta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Delete collection point (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se o ponto existe
    const existingPoint = await prisma.collectionPoint.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            collections: true
          }
        }
      }
    });

    if (!existingPoint) {
      return res.status(404).json({ error: 'Ponto de coleta não encontrado' });
    }

    // Verificar se há coletas associadas
    if (existingPoint._count.collections > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir ponto de coleta com coletas associadas' 
      });
    }

    await prisma.collectionPoint.delete({
      where: { id }
    });

    res.json({
      message: 'Ponto de coleta excluído com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir ponto de coleta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get collection point statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const point = await prisma.collectionPoint.findUnique({
      where: { id },
      include: {
        collections: {
          include: {
            collector: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!point) {
      return res.status(404).json({ error: 'Ponto de coleta não encontrado' });
    }

    // Calcular estatísticas
    const totalCollections = point.collections.length;
    const totalWeight = point.collections.reduce((sum, c) => sum + c.weight, 0);
    const totalPoints = point.collections.reduce((sum, c) => sum + c.points, 0);

    // Coletas por tipo
    const collectionsByType = point.collections.reduce((acc, collection) => {
      if (!acc[collection.type]) {
        acc[collection.type] = { count: 0, weight: 0, points: 0 };
      }
      acc[collection.type].count++;
      acc[collection.type].weight += collection.weight;
      acc[collection.type].points += collection.points;
      return acc;
    }, {});

    // Coletas por status
    const collectionsByStatus = point.collections.reduce((acc, collection) => {
      if (!acc[collection.status]) {
        acc[collection.status] = 0;
      }
      acc[collection.status]++;
      return acc;
    }, {});

    // Coletas recentes (últimos 30 dias)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCollections = point.collections.filter(
      c => c.collectedAt >= thirtyDaysAgo
    ).length;

    res.json({
      totalCollections,
      totalWeight,
      totalPoints,
      collectionsByType,
      collectionsByStatus,
      recentCollections,
      averageWeightPerCollection: totalCollections > 0 ? totalWeight / totalCollections : 0
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas do ponto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
