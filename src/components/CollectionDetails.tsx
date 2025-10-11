import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  Container,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Verified as VerifiedIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Scale as ScaleIcon,
  Category as CategoryIcon,
  QrCode as QrCodeIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CollectionItem, TrackingEvent } from '../types';
import ApiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PhotoCapture from './PhotoCapture';

interface CollectionDetailsProps {
  collectionId: string;
  onBack: () => void;
}

const CollectionDetails: React.FC<CollectionDetailsProps> = ({ collectionId, onBack }) => {
  const { user } = useAuth();
  const [collection, setCollection] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextStageDialog, setNextStageDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [stageNotes, setStageNotes] = useState('');
  const [stageLocation, setStageLocation] = useState('');
  const [stagePhotoData, setStagePhotoData] = useState<string | undefined>();
  const [stagePhotoHash, setStagePhotoHash] = useState<string | undefined>();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadCollectionDetails();
  }, [collectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCollectionDetails = async () => {
    try {
      setLoading(true);
      const result = await ApiService.authenticatedRequest(`/collections/${collectionId}`);
      
      if (result.ok) {
        const data = await result.json();
        setCollection(data.collection);
      } else {
        setError('Coleta não encontrada.');
      }
    } catch (error) {
      setError('Erro ao carregar detalhes da coleta.');
      console.error('Erro ao carregar coleta:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageInfo = (stage: string) => {
    const stages = {
      collected: { label: 'Coletado', color: 'primary', icon: '📦' },
      processing: { label: 'Processando', color: 'warning', icon: '⚙️' },
      shipped_to_industry: { label: 'Enviado à Indústria', color: 'info', icon: '🚚' },
      completed: { label: 'Concluído', color: 'success', icon: '✅' }
    };
    return stages[stage as keyof typeof stages] || { label: stage, color: 'default', icon: '❓' };
  };

  const getNextStages = (currentStage: string) => {
    const stageFlow = {
      collected: ['processing'],
      processing: ['shipped_to_industry'],
      shipped_to_industry: ['completed'],
      completed: []
    };
    return stageFlow[currentStage as keyof typeof stageFlow] || [];
  };

  const handleAdvanceStage = (stage: string) => {
    setSelectedStage(stage);
    setStageNotes('');
    setStageLocation(collection?.location || '');
    setStagePhotoData(undefined);
    setStagePhotoHash(undefined);
    setNextStageDialog(true);
  };

  const handleSubmitStage = async () => {
    if (!collection || !user) return;

    try {
      setProcessing(true);

      const result = await ApiService.authenticatedRequest(
        `/collections/${collectionId}/tracking`,
        {
          method: 'POST',
          body: JSON.stringify({
            stage: selectedStage,
            location: stageLocation,
            notes: stageNotes,
            photoUrl: stagePhotoData,
            photoHash: stagePhotoHash
          })
        }
      );

      if (result.ok) {
        await loadCollectionDetails();
        setNextStageDialog(false);
      } else {
        setError('Erro ao avançar etapa da coleta.');
      }
    } catch (error) {
      console.error('Erro ao avançar etapa:', error);
      setError('Erro ao avançar etapa da coleta.');
    } finally {
      setProcessing(false);
    }
  };

  const validateBlockchain = async (hash: string) => {
    try {
      const result = await ApiService.authenticatedRequest(`/blockchain/validate/${hash}`);
      if (result.ok) {
        const data = await result.json();
        return data.valid;
      }
      return false;
    } catch (err) {
      console.error('Erro ao validar blockchain:', err);
      return false;
    }
  };

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Carregando detalhes da coleta...</Typography>
      </Box>
    );
  }

  if (error || !collection) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" color="primary">
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={onBack} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">Detalhes da Coleta</Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="error">{error || 'Coleta não encontrada.'}</Alert>
        </Container>
      </Box>
    );
  }

  const currentStage = collection.trackingHistory[collection.trackingHistory.length - 1]?.stage || 'collected';
  const nextStages = getNextStages(currentStage);
  const stageInfo = getStageInfo(currentStage);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">Detalhes da Coleta</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip 
            label={stageInfo.label} 
            color={stageInfo.color as any}
            icon={<span>{stageInfo.icon}</span>}
            sx={{ color: 'white' }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Informações da Coleta */}
          <Box sx={{ flex: '2 1 600px', minWidth: '300px' }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Informações da Coleta
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Tipo de Material
                        </Typography>
                        <Typography variant="h6">
                          {collection.type.charAt(0).toUpperCase() + collection.type.slice(1)}
                        </Typography>
                      </Box>
                    </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ScaleIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Peso
                      </Typography>
                      <Typography variant="h6">
                        {collection.weight} kg
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Localização
                      </Typography>
                      <Typography variant="h6">
                        {collection.location}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Coletor
                      </Typography>
                      <Typography variant="h6">
                        {collection.collectorName}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Data da Coleta
                      </Typography>
                      <Typography variant="h6">
                        {format(new Date(collection.collectedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Pontos Ganhos
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {collection.points} pts
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {collection.qrCode && (
                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <QrCodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="subtitle1">
                        Código QR da Coleta
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {collection.qrCode}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Timeline de Rastreamento */}
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Timeline de Rastreamento
                </Typography>
                
                <Stepper orientation="vertical" sx={{ mt: 2 }}>
                  {collection.trackingHistory.map((event, index) => {
                    const eventStageInfo = getStageInfo(event.stage);
                    return (
                      <Step key={event.id} active>
                        <StepLabel>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: 8 }}>{eventStageInfo.icon}</span>
                            <Typography variant="h6">{eventStageInfo.label}</Typography>
                            <Chip 
                              label="Validado" 
                              color="success" 
                              size="small" 
                              sx={{ ml: 2 }}
                              icon={<VerifiedIcon />}
                            />
                          </Box>
                        </StepLabel>
                        <StepContent>
                          <Paper sx={{ p: 2, mb: 2 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Responsável
                                </Typography>
                                <Typography variant="body1">
                                  {event.responsiblePerson}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Data/Hora
                                </Typography>
                                <Typography variant="body1">
                                  {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </Typography>
                              </Box>
                              <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography variant="body2" color="text.secondary">
                                  Localização
                                </Typography>
                                <Typography variant="body1">
                                  {event.location}
                                </Typography>
                              </Box>
                              {event.notes && (
                                <Box sx={{ gridColumn: '1 / -1' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Observações
                                  </Typography>
                                  <Typography variant="body1">
                                    {event.notes}
                                  </Typography>
                                </Box>
                              )}
                              {event.photoUrl && (
                                <Box sx={{ gridColumn: '1 / -1' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Evidência Fotográfica
                                  </Typography>
                                  <Box sx={{ mt: 1 }}>
                                    <img 
                                      src={event.photoUrl} 
                                      alt="Evidência" 
                                      style={{ 
                                        maxWidth: '200px', 
                                        maxHeight: '150px', 
                                        borderRadius: '8px',
                                        border: '1px solid #ddd'
                                      }} 
                                    />
                                  </Box>
                                </Box>
                              )}
                              <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography variant="body2" color="text.secondary">
                                  Hash Blockchain
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '0.8rem',
                                    wordBreak: 'break-all'
                                  }}
                                >
                                  {event.blockchainHash}
                                </Typography>
                              </Box>
                            </Box>
                          </Paper>
                        </StepContent>
                      </Step>
                    );
                  })}
                </Stepper>
              </CardContent>
            </Card>
          </Box>

          {/* Ações e Informações Adicionais */}
          <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
            {/* Botões de Ação */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Ações Disponíveis
                </Typography>
                
                {nextStages.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Avançar para próxima etapa:
                    </Typography>
                    {nextStages.map((stage) => {
                      const stageInfo = getStageInfo(stage);
                      return (
                        <Button
                          key={stage}
                          variant="contained"
                          color={stageInfo.color as any}
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleAdvanceStage(stage)}
                          sx={{ mb: 1, display: 'block', width: '100%' }}
                        >
                          <span style={{ marginRight: 8 }}>{stageInfo.icon}</span>
                          {stageInfo.label}
                        </Button>
                      );
                    })}
                  </Box>
                )}

                {currentStage === 'completed' && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      ✅ Coleta concluída com sucesso!
                    </Typography>
                  </Alert>
                )}

                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => {/* Implementar edição */}}
                  disabled
                  sx={{ width: '100%' }}
                >
                  Editar Coleta
                </Button>
              </CardContent>
            </Card>

            {/* Informações do Blockchain */}
            {collection.blockchainHash && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Verificação Blockchain
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Hash da Coleta:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.8rem',
                      wordBreak: 'break-all',
                      mb: 2
                    }}
                  >
                    {collection.blockchainHash}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<VerifiedIcon />}
                    onClick={() => validateBlockchain(collection.blockchainHash!)}
                  >
                    Verificar Integridade
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      </Container>

      {/* Dialog para avançar etapa */}
      <Dialog 
        open={nextStageDialog} 
        onClose={() => setNextStageDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Avançar para {getStageInfo(selectedStage).label}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Localização"
              value={stageLocation}
              onChange={(e) => setStageLocation(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              fullWidth
              label="Observações"
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" gutterBottom>
              Evidência Fotográfica (Opcional)
            </Typography>
            <PhotoCapture
              onPhotoCapture={(photoData, photoHash) => {
                setStagePhotoData(photoData);
                setStagePhotoHash(photoHash);
              }}
              onPhotoRemove={() => {
                setStagePhotoData(undefined);
                setStagePhotoHash(undefined);
              }}
              currentPhoto={stagePhotoData}
              currentHash={stagePhotoHash}
              required={false}
              disabled={processing}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setNextStageDialog(false)}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmitStage}
            variant="contained"
            disabled={processing || !stageLocation.trim()}
            startIcon={processing ? <CheckCircleIcon /> : <PlayArrowIcon />}
          >
            {processing ? 'Processando...' : 'Confirmar Etapa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollectionDetails;
