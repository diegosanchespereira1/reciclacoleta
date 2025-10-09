import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Avatar
} from '@mui/material';
import {
  Recycling as RecycleIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Description as PaperIcon,
  LocalDrink as PlasticIcon,
  WineBar as GlassIcon,
  Build as MetalIcon,
  Restaurant as OrganicIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { CollectionStats } from '../types';
import { StatsService } from '../services/statsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  onNewCollection: () => void;
  onCollectionPoints: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNewCollection, onCollectionPoints }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<CollectionStats | null>(null);

  useEffect(() => {
    if (user) {
      const userStats = user.role === 'admin' 
        ? StatsService.getCollectionStats()
        : StatsService.getCollectorStats(user.id);
      setStats(userStats);
    }
  }, [user]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'papel': return <PaperIcon sx={{ color: '#8d6e63' }} />;
      case 'plastico': return <PlasticIcon sx={{ color: '#1976d2' }} />;
      case 'vidro': return <GlassIcon sx={{ color: '#4caf50' }} />;
      case 'metal': return <MetalIcon sx={{ color: '#ff9800' }} />;
      case 'organico': return <OrganicIcon sx={{ color: '#795548' }} />;
      default: return <RecycleIcon />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'papel': return 'Papel';
      case 'plastico': return 'Plástico';
      case 'vidro': return 'Vidro';
      case 'metal': return 'Metal';
      case 'organico': return 'Orgânico';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collected': return 'primary';
      case 'processed': return 'secondary';
      case 'disposed': return 'success';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'collected': return 'Coletado';
      case 'processed': return 'Processado';
      case 'disposed': return 'Descartado';
      default: return status;
    }
  };

  if (!user || !stats) {
    return <Box>Carregando...</Box>;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: '#2e7d32' }}>
        <Toolbar>
          <RecycleIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ♻️ Recicla Coleta - Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Avatar sx={{ bgcolor: '#1b5e20', mr: 1 }}>
              <PersonIcon />
            </Avatar>
            <Typography variant="body2">
              {user.name} ({user.role === 'admin' ? 'Administrador' : 'Coletor'})
            </Typography>
          </Box>
          <Button
            color="inherit"
            startIcon={<AddIcon />}
            onClick={onNewCollection}
            sx={{ mr: 1 }}
          >
            Nova Coleta
          </Button>
          <Button
            color="inherit"
            startIcon={<LocationOnIcon />}
            onClick={onCollectionPoints}
            sx={{ mr: 2 }}
          >
            Pontos de Coleta
          </Button>
          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Cards de estatísticas */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                background: 'linear-gradient(45deg, #4caf50, #66bb6a)',
                color: 'white',
                flex: '1 1 200px',
                minWidth: '200px'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <RecycleIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Total de Itens</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.totalItems}
              </Typography>
            </Paper>

            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                background: 'linear-gradient(45deg, #2196f3, #42a5f5)',
                color: 'white',
                flex: '1 1 200px',
                minWidth: '200px'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Peso Total</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.totalWeight.toFixed(1)} kg
              </Typography>
            </Paper>

            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                background: 'linear-gradient(45deg, #ff9800, #ffb74d)',
                color: 'white',
                flex: '1 1 200px',
                minWidth: '200px'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LocationOnIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Tipos Únicos</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {Object.keys(stats.itemsByType).length}
              </Typography>
            </Paper>

            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 140,
                background: 'linear-gradient(45deg, #9c27b0, #ba68c8)',
                color: 'white',
                flex: '1 1 200px',
                minWidth: '200px'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Coletas Recentes</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.recentCollections.length}
              </Typography>
            </Paper>
          </Box>

          {/* Conteúdo principal */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* Gráfico de tipos de material */}
            <Paper sx={{ p: 2, height: 400, flex: '1 1 400px', minWidth: '300px' }}>
              <Typography variant="h6" gutterBottom>
                Itens por Tipo de Material
              </Typography>
              <Box sx={{ height: 300, overflow: 'auto' }}>
                {Object.entries(stats.itemsByType).map(([type, count]) => (
                  <Box key={type} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ mr: 2 }}>
                      {getTypeIcon(type)}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1">
                        {getTypeLabel(type)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {count} itens • {stats.weightByType[type]?.toFixed(1)} kg
                      </Typography>
                    </Box>
                    <Chip 
                      label={count} 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Lista de coletas recentes */}
            <Paper sx={{ p: 2, height: 400, flex: '1 1 400px', minWidth: '300px' }}>
              <Typography variant="h6" gutterBottom>
                Coletas Recentes
              </Typography>
              <List sx={{ height: 300, overflow: 'auto' }}>
                {stats.recentCollections.map((collection) => (
                  <ListItem key={collection.id} divider>
                    <ListItemIcon>
                      {getTypeIcon(collection.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {getTypeLabel(collection.type)}
                          </Typography>
                          <Chip
                            label={getStatusLabel(collection.status)}
                            color={getStatusColor(collection.status)}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {collection.weight} kg • {collection.collectionPointName || collection.location}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {format(new Date(collection.collectedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Coletor: {collection.collectorName}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;