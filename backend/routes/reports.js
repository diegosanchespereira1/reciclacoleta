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

// Get report data
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { 
      startDate, 
      endDate, 
      collectorId, 
      type, 
      status 
    } = req.query;

    let whereClause = {};

    // Se for coletor, só suas próprias coletas
    if (role === 'collector') {
      whereClause.collectorId = userId;
    }

    // Filtros
    if (startDate && endDate) {
      whereClause.collectedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (collectorId && role === 'admin') {
      whereClause.collectorId = collectorId;
    }

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    // Buscar dados
    const [
      collections,
      totalCollections,
      totalWeight,
      totalPoints,
      collectionsByType,
      collectionsByStatus,
      collectionsByCollector,
      dailyStats
    ] = await Promise.all([
      // Coletas com filtros
      prisma.collectionItem.findMany({
        where: whereClause,
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
        orderBy: { collectedAt: 'desc' }
      }),

      // Total de coletas
      prisma.collectionItem.count({ where: whereClause }),

      // Peso total
      prisma.collectionItem.aggregate({
        where: whereClause,
        _sum: { weight: true }
      }),

      // Pontos totais
      prisma.collectionItem.aggregate({
        where: whereClause,
        _sum: { points: true }
      }),

      // Coletas por tipo
      prisma.collectionItem.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { type: true },
        _sum: { weight: true },
        _sum: { points: true }
      }),

      // Coletas por status
      prisma.collectionItem.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true }
      }),

      // Coletas por coletor (apenas para admin)
      role === 'admin' ? prisma.collectionItem.groupBy({
        by: ['collectorId', 'collectorName'],
        where: whereClause,
        _count: { collectorId: true },
        _sum: { weight: true },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } }
      }) : [],

      // Estatísticas diárias
      prisma.collectionItem.groupBy({
        by: ['collectedAt'],
        where: whereClause,
        _count: { collectedAt: true },
        _sum: { weight: true },
        _sum: { points: true }
      })
    ]);

    // Processar estatísticas diárias
    const dailyStatsProcessed = dailyStats.map(stat => ({
      date: stat.collectedAt.toISOString().split('T')[0],
      count: stat._count.collectedAt,
      weight: stat._sum.weight || 0,
      points: stat._sum.points || 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      collections,
      summary: {
        totalCollections,
        totalWeight: totalWeight._sum.weight || 0,
        totalPoints: totalPoints._sum.points || 0
      },
      charts: {
        collectionsByType,
        collectionsByStatus,
        collectionsByCollector,
        dailyStats: dailyStatsProcessed
      },
      filters: {
        startDate,
        endDate,
        collectorId,
        type,
        status
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get collector statistics
router.get('/collectors', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const collectors = await prisma.user.findMany({
      where: { role: 'collector' },
      include: {
        points: true,
        _count: {
          select: {
            collections: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        points: true,
        _count: true
      }
    });

    // Buscar estatísticas detalhadas para cada coletor
    const collectorsWithStats = await Promise.all(
      collectors.map(async (collector) => {
        const [totalWeight, collectionsByType, recentCollections] = await Promise.all([
          prisma.collectionItem.aggregate({
            where: { collectorId: collector.id },
            _sum: { weight: true }
          }),
          prisma.collectionItem.groupBy({
            by: ['type'],
            where: { collectorId: collector.id },
            _count: { type: true },
            _sum: { weight: true }
          }),
          prisma.collectionItem.findMany({
            where: { collectorId: collector.id },
            orderBy: { collectedAt: 'desc' },
            take: 5,
            select: {
              id: true,
              type: true,
              weight: true,
              points: true,
              collectedAt: true,
              status: true
            }
          })
        ]);

        return {
          ...collector,
          totalWeight: totalWeight._sum.weight || 0,
          totalPoints: collector.points?.totalPoints || 0,
          level: collector.points?.level || 'Novato',
          collectionsByType,
          recentCollections
        };
      })
    );

    // Ordenar por pontos
    collectorsWithStats.sort((a, b) => b.totalPoints - a.totalPoints);

    res.json(collectorsWithStats);

  } catch (error) {
    console.error('Erro ao buscar estatísticas dos coletores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.user;

    let whereClause = {};

    // Se for coletor, só suas próprias estatísticas
    if (role === 'collector') {
      whereClause.collectorId = userId;
    }

    // Buscar dados do dashboard
    const [
      totalCollections,
      totalWeight,
      totalPoints,
      collectionsByType,
      recentCollections,
      monthlyStats,
      topCollectors
    ] = await Promise.all([
      // Total de coletas
      prisma.collectionItem.count({ where: whereClause }),

      // Peso total
      prisma.collectionItem.aggregate({
        where: whereClause,
        _sum: { weight: true }
      }),

      // Pontos totais
      prisma.collectionItem.aggregate({
        where: whereClause,
        _sum: { points: true }
      }),

      // Coletas por tipo
      prisma.collectionItem.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { type: true },
        _sum: { weight: true }
      }),

      // Coletas recentes
      prisma.collectionItem.findMany({
        where: whereClause,
        include: {
          collector: {
            select: { name: true }
          }
        },
        orderBy: { collectedAt: 'desc' },
        take: 10
      }),

      // Estatísticas do mês atual
      prisma.collectionItem.count({
        where: {
          ...whereClause,
          collectedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),

      // Top coletores (apenas para admin)
      role === 'admin' ? prisma.collectionItem.groupBy({
        by: ['collectorId', 'collectorName'],
        _count: { collectorId: true },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
        take: 5
      }) : []
    ]);

    res.json({
      summary: {
        totalCollections,
        totalWeight: totalWeight._sum.weight || 0,
        totalPoints: totalPoints._sum.points || 0,
        monthlyCollections: monthlyStats
      },
      collectionsByType,
      recentCollections,
      topCollectors
    });

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
