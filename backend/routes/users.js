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

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        points: true,
        collections: {
          select: {
            id: true,
            type: true,
            weight: true,
            points: true,
            collectedAt: true,
            status: true
          },
          orderBy: { collectedAt: 'desc' },
          take: 10
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        points: true,
        collections: true,
        transactions: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Calcular estatísticas
    const totalCollections = await prisma.collectionItem.count({
      where: { collectorId: userId }
    });

    const totalWeight = await prisma.collectionItem.aggregate({
      where: { collectorId: userId },
      _sum: { weight: true }
    });

    const totalPoints = user.points?.totalPoints || 0;

    res.json({
      user: {
        ...user,
        totalCollections,
        totalWeight: totalWeight._sum.weight || 0,
        totalPoints
      }
    });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { userId, role } = req.user;

    let whereClause = {};
    
    // Se for coletor, só suas próprias estatísticas
    if (role === 'collector') {
      whereClause.collectorId = userId;
    }

    // Estatísticas gerais
    const [
      totalCollections,
      totalWeight,
      collectionsByType,
      collectionsByStatus,
      recentCollections,
      topCollectors
    ] = await Promise.all([
      // Total de coletas
      prisma.collectionItem.count({ where: whereClause }),
      
      // Peso total
      prisma.collectionItem.aggregate({
        where: whereClause,
        _sum: { weight: true }
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
      
      // Coletas recentes (últimos 7 dias)
      prisma.collectionItem.findMany({
        where: {
          ...whereClause,
          collectedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          collector: {
            select: { name: true }
          }
        },
        orderBy: { collectedAt: 'desc' },
        take: 10
      }),
      
      // Top coletores (apenas para admin)
      role === 'admin' ? prisma.collectionItem.groupBy({
        by: ['collectorId', 'collectorName'],
        _count: { collectorId: true },
        _sum: { weight: true },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
        take: 10
      }) : []
    ]);

    res.json({
      totalCollections,
      totalWeight: totalWeight._sum.weight || 0,
      totalPoints: totalWeight._sum.points || 0,
      collectionsByType,
      collectionsByStatus,
      recentCollections,
      topCollectors
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const users = await prisma.user.findMany({
      include: {
        points: true,
        _count: {
          select: {
            collections: true,
            transactions: true
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        points: true,
        _count: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);

  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, email } = req.body;

    // Verificar se email já existe em outro usuário
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get user points and transactions
router.get('/points', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    const [points, transactions] = await Promise.all([
      prisma.userPoints.findUnique({
        where: { userId }
      }),
      prisma.pointsTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    res.json({
      points: points || { totalPoints: 0, level: 'Novato' },
      transactions
    });

  } catch (error) {
    console.error('Erro ao buscar pontos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get leaderboard
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = await prisma.userPoints.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { totalPoints: 'desc' },
      take: parseInt(limit)
    });

    res.json(leaderboard);

  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
