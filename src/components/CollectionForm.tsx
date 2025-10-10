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
import { CollectionItem, CollectionPoint } from '../types';
import PhotoCapture from './PhotoCapture';

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
  const [photoData, setPhotoData] = useState<string | undefined>();
  const [photoHash, setPhotoHash] = useState<string | undefined>();
  const [trackingId, setTrackingId] = useState<string>('');

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
      
      // Criar coleta com dados básicos
      const collection = await DatabaseService.createCollection({
        type: formData.type,
        weight,
        location: formData.location,
        collectionPointId: formData.collectionPointId || undefined,
        collectionPointName: selectedPoint?.name,
        collectorId: user.id,
        collectorName: user.name,
        status: formData.status
      });

      // Adicionar dados de rastreamento à coleta
      const collectionWithTracking = {
        ...collection,
        trackingId,
        photoUrl: photoData,
        photoHash,
        points: 0,
        trackingHistory: [] as any[]
      };

      // Calcular pontos
      const points = PointsService.calculatePoints(collectionWithTracking);
      collectionWithTracking.points = points;

      // Criar evento de rastreamento inicial
      const trackingEvent = {
        id: crypto.randomUUID(),
        collectionId: collection.id,
        stage: 'collected' as const,
        timestamp: new Date(),
        location: formData.location,
        responsiblePerson: user.name,
        responsiblePersonId: user.id,
        notes: `Coleta inicial registrada por ${user.name}`,
        photoUrl: photoData,
        photoHash,
        weight,
        blockchainHash: undefined as string | undefined
      };

      // Adicionar ao blockchain
      const blockchainHash = await BlockchainService.addRecord(
        collection.id,
        trackingEvent.id,
        'collected',
        weight,
        formData.location,
        user.name,
        photoHash
      );

      trackingEvent.blockchainHash = blockchainHash;
      collectionWithTracking.blockchainHash = blockchainHash;
      collectionWithTracking.trackingHistory = [trackingEvent];

      // Adicionar pontos ao usuário
      await PointsService.addPoints(user.id, collectionWithTracking, 'confirmed');

      // Salvar coleta atualizada
      await DatabaseService.updateCollectionWithTracking(collectionWithTracking);

      setSuccess(true);
      setFormData({
        type: 'papel',
        weight: '',
        location: '',
        collectionPointId: '',
        status: 'collected'
      });
      setPhotoData(undefined);
      setPhotoHash(undefined);
      setTrackingId(BlockchainService.generateTrackingId());

      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError('Erro ao registrar coleta');
      console.error('Erro ao registrar coleta:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoCapture = (photoData: string, photoHash: string) => {
    setPhotoData(photoData);
    setPhotoHash(photoHash);
  };

  const handlePhotoRemove = () => {
    setPhotoData(undefined);
    setPhotoHash(undefined);
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
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Preencha as informações abaixo para registrar uma nova coleta de material reciclável
            </Typography>
            {trackingId && (
              <Box sx={{ 
                backgroundColor: '#e8f5e8', 
                p: 2, 
                borderRadius: 2, 
                border: '1px solid #4caf50',
                mb: 2
              }}>
                <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                  🔗 ID de Rastreamento: {trackingId}
                </Typography>
                <Typography variant="caption" sx={{ color: '#2e7d32' }}>
                  Este ID será usado para rastrear o material durante todo o processo
                </Typography>
              </Box>
            )}
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                ✅ Coleta registrada com sucesso!
              </Typography>
              <Typography variant="body2">
                • Material registrado no blockchain<br/>
                • Pontos calculados e creditados<br/>
                • Rastreamento ativo com ID: {trackingId}
              </Typography>
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

              {/* Componente de captura de foto */}
              <PhotoCapture
                onPhotoCapture={handlePhotoCapture}
                onPhotoRemove={handlePhotoRemove}
                currentPhoto={photoData}
                currentHash={photoHash}
                required={false}
                disabled={loading}
              />

              {/* Informações de pontos */}
              {formData.weight && formData.type && (
                <Box sx={{ 
                  backgroundColor: '#e3f2fd', 
                  p: 2, 
                  borderRadius: 2, 
                  border: '1px solid #2196f3'
                }}>
                  <Typography variant="subtitle2" sx={{ color: '#1976d2', fontWeight: 'bold', mb: 1 }}>
                    🎯 Sistema de Pontos
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1976d2' }}>
                    Material: {getTypeLabel(formData.type)} • Peso: {formData.weight} kg<br/>
                    Pontos a receber: {PointsService.calculatePoints({
                      id: 'temp-id',
                      type: formData.type,
                      weight: parseFloat(formData.weight),
                      collectorId: user?.id || '',
                      collectorName: user?.name || '',
                      collectedAt: new Date(),
                      location: formData.location,
                      status: formData.status,
                      qrCode: '',
                      trackingId: trackingId,
                      points: 0,
                      trackingHistory: []
                    } as CollectionItem)} pontos
                  </Typography>
                </Box>
              )}
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