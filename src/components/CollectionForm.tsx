import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  IconButton,
  Avatar
} from '@mui/material';
import {
  Recycling as RecycleIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  LocationOn as LocationOnIcon,
  Scale as ScaleIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/database';
import { CollectionPointService } from '../services/collectionPointService';
import { CollectionItem, CollectionPoint } from '../types';

interface CollectionFormProps {
  onBack: () => void;
}

const CollectionForm: React.FC<CollectionFormProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'papel' as CollectionItem['type'],
    weight: '',
    location: '',
    collectionPointId: '',
    status: 'collected' as CollectionItem['status']
  });
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const points = CollectionPointService.getActiveCollectionPoints();
    setCollectionPoints(points);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!user) {
      setError('Usuário não encontrado');
      setLoading(false);
      return;
    }

    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      setError('Peso deve ser maior que zero');
      setLoading(false);
      return;
    }

    try {
      const selectedPoint = collectionPoints.find(p => p.id === formData.collectionPointId);
      await DatabaseService.createCollection({
        type: formData.type,
        weight: parseFloat(formData.weight),
        location: formData.location,
        collectionPointId: formData.collectionPointId || undefined,
        collectionPointName: selectedPoint?.name,
        collectorId: user.id,
        collectorName: user.name,
        status: formData.status
      });

      setSuccess(true);
      setFormData({
        type: 'papel',
        weight: '',
        location: '',
        collectionPointId: '',
        status: 'collected'
      });

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError('Erro ao registrar coleta');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'papel': return '📄';
      case 'plastico': return '🥤';
      case 'vidro': return '🍾';
      case 'metal': return '🥫';
      case 'organico': return '🍌';
      default: return '♻️';
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

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: '#2e7d32' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={onBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <RecycleIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Nova Coleta
          </Typography>
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

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 'bold', mb: 1 }}>
              ♻️ Registrar Nova Coleta
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Preencha as informações abaixo para registrar uma nova coleta de material reciclável
            </Typography>
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Coleta registrada com sucesso!
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Ponto de Coleta */}
              <FormControl fullWidth required>
                <InputLabel id="collectionPoint-label">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationOnIcon sx={{ mr: 1 }} />
                    Ponto de Coleta
                  </Box>
                </InputLabel>
                <Select
                  labelId="collectionPoint-label"
                  id="collectionPoint"
                  value={formData.collectionPointId}
                  label="Ponto de Coleta"
                  onChange={(e) => setFormData({ ...formData, collectionPointId: e.target.value })}
                  disabled={loading}
                >
                  {collectionPoints.map((point) => (
                    <MenuItem key={point.id} value={point.id}>
                      <Box>
                        <Typography variant="body1">{point.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {point.address}, {point.city}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth required>
                  <InputLabel id="type-label">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CategoryIcon sx={{ mr: 1 }} />
                      Tipo de Material
                    </Box>
                  </InputLabel>
                  <Select
                    labelId="type-label"
                    id="type"
                    value={formData.type}
                    label="Tipo de Material"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as CollectionItem['type'] })}
                    disabled={loading}
                  >
                    <MenuItem value="papel">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ mr: 1 }}>📄</Typography>
                        Papel
                      </Box>
                    </MenuItem>
                    <MenuItem value="plastico">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ mr: 1 }}>🥤</Typography>
                        Plástico
                      </Box>
                    </MenuItem>
                    <MenuItem value="vidro">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ mr: 1 }}>🍾</Typography>
                        Vidro
                      </Box>
                    </MenuItem>
                    <MenuItem value="metal">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ mr: 1 }}>🥫</Typography>
                        Metal
                      </Box>
                    </MenuItem>
                    <MenuItem value="organico">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ mr: 1 }}>🍌</Typography>
                        Orgânico
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  required
                  fullWidth
                  id="weight"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ScaleIcon sx={{ mr: 1 }} />
                      Peso (kg)
                    </Box>
                  }
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  disabled={loading}
                  inputProps={{ min: 0.1, step: 0.1 }}
                />
              </Box>

              <TextField
                  required
                  fullWidth
                  id="location"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationOnIcon sx={{ mr: 1 }} />
                      Local da Coleta
                    </Box>
                  }
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={loading}
                  placeholder="Ex: Centro - São Paulo, SP"
                />

              <FormControl fullWidth>
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    labelId="status-label"
                    id="status"
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CollectionItem['status'] })}
                    disabled={loading}
                  >
                    <MenuItem value="collected">Coletado</MenuItem>
                    <MenuItem value="processed">Processado</MenuItem>
                    <MenuItem value="disposed">Descartado</MenuItem>
                  </Select>
                </FormControl>
            </Box>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={onBack}
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ 
                  minWidth: 120,
                  backgroundColor: '#2e7d32',
                  '&:hover': {
                    backgroundColor: '#1b5e20',
                  }
                }}
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {loading ? 'Salvando...' : 'Registrar Coleta'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CollectionForm;