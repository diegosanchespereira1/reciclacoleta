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
  Avatar,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Recycling as RecycleIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Add as AddIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import { CollectionPoint } from '../types';

interface CollectionPointsListProps {
  onBack: () => void;
  onNewPoint: () => void;
}

const CollectionPointsList: React.FC<CollectionPointsListProps> = ({ onBack, onNewPoint }) => {
  const { user } = useAuth();
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = async () => {
    try {
      const data = await ApiService.getCollectionPoints();
      setPoints(data.collectionPoints);
    } catch (err) {
      setError('Erro ao carregar pontos de coleta');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (pointId: string, isActive: boolean) => {
    try {
      await ApiService.updateCollectionPoint(pointId, { isActive });
      loadPoints();
    } catch (err) {
      setError('Erro ao atualizar status do ponto');
    }
  };

  const handleDelete = async (pointId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este ponto de coleta?')) {
      try {
        await ApiService.deleteCollectionPoint(pointId);
        loadPoints();
      } catch (err) {
        setError('Erro ao excluir ponto de coleta');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: '#2e7d32' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={onBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <RecycleIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Pontos de Coleta
          </Typography>
          <Button
            color="inherit"
            startIcon={<AddIcon />}
            onClick={onNewPoint}
            sx={{ mr: 2 }}
          >
            Novo Ponto
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: '#1b5e20', mr: 1 }}>
              <PersonIcon />
            </Avatar>
            <Typography variant="body2">
              {user?.name}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Lista de Pontos de Coleta ({points.length})
          </Typography>

          {points.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Nenhum ponto de coleta cadastrado
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onNewPoint}
                sx={{ backgroundColor: '#2e7d32' }}
              >
                Cadastrar Primeiro Ponto
              </Button>
            </Box>
          ) : (
            <List>
              {points.map((point) => (
                <ListItem key={point.id} divider>
                  <ListItemIcon>
                    <BusinessIcon sx={{ color: point.isActive ? '#2e7d32' : '#666' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6">
                          {point.name}
                        </Typography>
                        <Chip
                          label={point.isActive ? 'Ativo' : 'Inativo'}
                          color={point.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 16, color: '#666' }} />
                          <Typography variant="body2" color="text.secondary">
                            {point.responsibleName}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 16, color: '#666' }} />
                          <Typography variant="body2" color="text.secondary">
                            {point.phone}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <EmailIcon sx={{ fontSize: 16, color: '#666' }} />
                          <Typography variant="body2" color="text.secondary">
                            {point.email}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <LocationOnIcon sx={{ fontSize: 16, color: '#666' }} />
                          <Typography variant="body2" color="text.secondary">
                            {point.address}, {point.city}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Cadastrado em: {new Date(point.createdAt).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={point.isActive}
                          onChange={(e) => handleToggleActive(point.id, e.target.checked)}
                          color="success"
                          size="small"
                        />
                      }
                      label="Ativo"
                      labelPlacement="start"
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          // TODO: Implementar edição
                          alert('Funcionalidade de edição será implementada em breve');
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(point.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default CollectionPointsList;
