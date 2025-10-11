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
import ApiService from '../services/api';
import { CollectionPoint } from '../types';

interface CollectionFormProps {
  onBack: () => void;
}

const CollectionForm: React.FC<CollectionFormProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'papel' as const,
    weight: '',
    location: '',
    collectionPointId: '',
    status: 'collected' as const
  });
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCollectionPoints = async () => {
      try {
        const pointsData = await ApiService.getCollectionPoints();
        setCollectionPoints(pointsData.collectionPoints);
      } catch (error) {
        console.error('Erro ao carregar pontos de coleta:', error);
      }
    };

    loadCollectionPoints();
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
      const weight = parseFloat(formData.weight);
      
      // Criar coleta usando a API
      const collectionData = {
        type: formData.type,
        weight,
        location: formData.location,
        collectionPointId: formData.collectionPointId || undefined,
        collectionPointName: selectedPoint?.name,
        status: formData.status
      };

      const result = await ApiService.createCollection(collectionData);
      
      setSuccess(true);
      setFormData({
        type: 'papel',
        weight: '',
        location: '',
        collectionPointId: '',
        status: 'collected'
      });

      setTimeout(() => {
        onBack();
      }, 2000);

    } catch (error) {
      console.error('Erro ao criar coleta:', error);
      setError('Erro ao criar coleta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  if (success) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" sx={{ backgroundColor: '#2e7d32' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" aria-label="back" onClick={onBack}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Nova Coleta
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <RecycleIcon sx={{ fontSize: 64, color: '#2e7d32', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="success.main">
              Coleta Registrada com Sucesso!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              A coleta foi registrada e você ganhou pontos por sua contribuição.
            </Typography>
            <CircularProgress size={24} sx={{ color: '#2e7d32' }} />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Redirecionando para o dashboard...
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: '#2e7d32' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="back" onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Nova Coleta
          </Typography>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <PersonIcon />
          </Avatar>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3, color: '#2e7d32' }}>
            <RecycleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Registrar Nova Coleta
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
              
              {/* Tipo de Material */}
              <FormControl fullWidth>
                <InputLabel id="type-label">
                  <CategoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Tipo de Material
                </InputLabel>
                <Select
                  labelId="type-label"
                  value={formData.type}
                  label="Tipo de Material"
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  <MenuItem value="papel">Papel</MenuItem>
                  <MenuItem value="plastico">Plástico</MenuItem>
                  <MenuItem value="vidro">Vidro</MenuItem>
                  <MenuItem value="metal">Metal</MenuItem>
                  <MenuItem value="organico">Orgânico</MenuItem>
                </Select>
              </FormControl>

              {/* Peso */}
              <TextField
                fullWidth
                label="Peso (kg)"
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                required
                inputProps={{ min: "0.1", step: "0.1" }}
                InputProps={{
                  startAdornment: <ScaleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />

              {/* Localização */}
              <TextField
                fullWidth
                label="Localização"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                required
                InputProps={{
                  startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />

              {/* Ponto de Coleta */}
              <FormControl fullWidth>
                <InputLabel id="collection-point-label">Ponto de Coleta</InputLabel>
                <Select
                  labelId="collection-point-label"
                  value={formData.collectionPointId}
                  label="Ponto de Coleta"
                  onChange={(e) => handleInputChange('collectionPointId', e.target.value)}
                >
                  <MenuItem value="">
                    <em>Selecionar ponto de coleta</em>
                  </MenuItem>
                  {collectionPoints.map((point) => (
                    <MenuItem key={point.id} value={point.id}>
                      {point.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

            </Box>

            {/* Botões */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
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
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                sx={{ 
                  minWidth: 120,
                  backgroundColor: '#2e7d32',
                  '&:hover': {
                    backgroundColor: '#1b5e20'
                  }
                }}
              >
                {loading ? 'Salvando...' : 'Salvar Coleta'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CollectionForm;
