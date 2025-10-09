import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  QrCode as QrCodeIcon,
  Photo as PhotoIcon,
  Timeline as TimelineIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Scale as ScaleIcon,
  Star as StarIcon,
  Block as BlockIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { CollectionItem, TrackingEvent } from '../types';
import { DatabaseService } from '../services/database';
import { BlockchainService } from '../services/blockchainService';
import { PointsService } from '../services/pointsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrackingDetailsProps {
  collectionId: string;
  onBack: () => void;
}

const TrackingDetails: React.FC<TrackingDetailsProps> = ({ collectionId, onBack }) => {
  const [collection, setCollection] = useState<CollectionItem | null>(null);
  const [blockchainRecords, setBlockchainRecords] = useState<any[]>([]);
  const [custodyChain, setCustodyChain] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadTrackingData();
  }, [collectionId]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados da coleta
      const collections = DatabaseService.getCollections();
      const foundCollection = collections.find(c => c.id === collectionId);
      
      if (!foundCollection) {
        setError('Coleta não encontrada');
        return;
      }

      setCollection(foundCollection);

      // Carregar registros do blockchain
      const records = BlockchainService.getRecordsByCollectionId(collectionId);
      setBlockchainRecords(records);

      // Carregar cadeia de custódia
      const chain = BlockchainService.getCustodyChain(collectionId);
      setCustodyChain(chain);

    } catch (err) {
      setError('Erro ao carregar dados de rastreamento');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'collected': return '📦';
      case 'processing': return '⚙️';
      case 'shipped_to_industry': return '🚚';
      case 'completed': return '✅';
      default: return '📋';
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'collected': return 'Coletado';
      case 'processing': return 'Processamento';
      case 'shipped_to_industry': return 'Enviado à Indústria';
      case 'completed': return 'Concluído';
      default: return stage;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'collected': return 'primary';
      case 'processing': return 'warning';
      case 'shipped_to_industry': return 'info';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'papel': return '📄';
      case 'plastico': return '🥤';
      case 'vidro': return '🍾';
      case 'metal': return '🥫';
      case 'organico': return '🍌';
      default: return '♻️';
    }
  };

  const getMaterialLabel = (type: string) => {
    switch (type) {
      case 'papel': return 'Papel';
      case 'plastico': return 'Plástico';
      case 'vidro': return 'Vidro';
      case 'metal': return 'Metal';
      case 'organico': return 'Orgânico';
      default: return type;
    }
  };

  const handlePhotoPreview = (photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    setPhotoPreviewOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Carregando dados de rastreamento...</Typography>
      </Box>
    );
  }

  if (error || !collection) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Coleta não encontrada'}
        </Alert>
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />}>
          Voltar
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} sx={{ color: '#2e7d32' }}>
          <ArrowBackIcon />
        </IconButton>
        <TimelineIcon sx={{ fontSize: 32, color: '#2e7d32' }} />
        <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
          🔍 Rastreamento Detalhado
        </Typography>
      </Box>

      {/* Informações da Coleta */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
            📋 Informações da Coleta
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: '#2e7d32' }}>
                  {getMaterialIcon(collection.type)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {getMaterialLabel(collection.type)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID: {collection.id}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ScaleIcon sx={{ color: '#2e7d32' }} />
                <Typography variant="body1">
                  <strong>Peso:</strong> {collection.weight} kg
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LocationIcon sx={{ color: '#2e7d32' }} />
                <Typography variant="body1">
                  <strong>Local:</strong> {collection.location}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonIcon sx={{ color: '#2e7d32' }} />
                <Typography variant="body1">
                  <strong>Coletor:</strong> {collection.collectorName}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ScheduleIcon sx={{ color: '#2e7d32' }} />
                <Typography variant="body1">
                  <strong>Data/Hora:</strong> {format(new Date(collection.collectedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <QrCodeIcon sx={{ color: '#2e7d32' }} />
                <Typography variant="body1">
                  <strong>QR Code:</strong> {collection.qrCode}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BlockIcon sx={{ color: '#2e7d32' }} />
                <Typography variant="body1">
                  <strong>Tracking ID:</strong> {collection.trackingId}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <StarIcon sx={{ color: '#2e7d32' }} />
                <Typography variant="body1">
                  <strong>Pontos:</strong> {collection.points} pontos
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Status e Blockchain */}
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip
              label={getStageLabel(collection.status)}
              color={getStageColor(collection.status)}
              icon={<span>{getStageIcon(collection.status)}</span>}
            />
            
            {collection.blockchainHash && (
              <Chip
                label="Registrado no Blockchain"
                color="success"
                icon={<VerifiedIcon />}
              />
            )}
          </Box>

          {collection.blockchainHash && (
            <Box sx={{ 
              backgroundColor: '#e8f5e8', 
              p: 2, 
              borderRadius: 2, 
              border: '1px solid #4caf50'
            }}>
              <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                🔗 Hash do Blockchain: {collection.blockchainHash}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Timeline de Rastreamento */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
            📈 Timeline de Rastreamento
          </Typography>
          
          <Stepper orientation="vertical">
            {collection.trackingHistory?.map((event, index) => (
              <Step key={event.id} active={true}>
                <StepLabel
                  icon={
                    <Avatar sx={{ bgcolor: '#2e7d32' }}>
                      {getStageIcon(event.stage)}
                    </Avatar>
                  }
                >
                  <Typography variant="h6">
                    {getStageLabel(event.stage)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>Responsável:</strong> {event.responsiblePerson}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>Local:</strong> {event.location}
                    </Typography>
                    {event.weight && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Peso:</strong> {event.weight} kg
                      </Typography>
                    )}
                    {event.notes && (
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Observações:</strong> {event.notes}
                      </Typography>
                    )}
                    
                    {event.photoUrl && (
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={<PhotoIcon />}
                          onClick={() => handlePhotoPreview(event.photoUrl!)}
                          sx={{ borderColor: '#2e7d32', color: '#2e7d32' }}
                        >
                          Ver Foto
                        </Button>
                      </Box>
                    )}
                    
                    {event.blockchainHash && (
                      <Box sx={{ 
                        backgroundColor: '#e3f2fd', 
                        p: 1, 
                        borderRadius: 1, 
                        mt: 1,
                        border: '1px solid #2196f3'
                      }}>
                        <Typography variant="caption" sx={{ color: '#1976d2' }}>
                          Blockchain: {event.blockchainHash}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Validação da Cadeia de Custódia */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
            🔒 Validação da Cadeia de Custódia
          </Typography>
          
          {custodyChain && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {custodyChain.isValid ? (
                  <>
                    <VerifiedIcon sx={{ color: '#4caf50', fontSize: 32 }} />
                    <Typography variant="h6" sx={{ color: '#4caf50' }}>
                      ✅ Cadeia de Custódia Válida
                    </Typography>
                  </>
                ) : (
                  <>
                    <WarningIcon sx={{ color: '#f44336', fontSize: 32 }} />
                    <Typography variant="h6" sx={{ color: '#f44336' }}>
                      ⚠️ Cadeia de Custódia com Problemas
                    </Typography>
                  </>
                )}
              </Box>
              
              <Typography variant="body1" sx={{ mb: 2 }}>
                Total de registros no blockchain: {custodyChain.chain.length}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Esta validação garante a integridade e autenticidade do rastreamento do material.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Registros do Blockchain */}
      {blockchainRecords.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
              ⛓️ Registros do Blockchain
            </Typography>
            
            <List>
              {blockchainRecords.map((record, index) => (
                <ListItem key={record.hash} divider>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: '#2e7d32' }}>
                      {index + 1}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {getStageLabel(record.data.stage)} - {format(new Date(record.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          <strong>Hash:</strong> {record.hash.substring(0, 20)}...
                        </Typography>
                        <Typography variant="body2">
                          <strong>Responsável:</strong> {record.data.responsiblePerson}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Local:</strong> {record.data.location}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Peso:</strong> {record.data.weight} kg
                        </Typography>
                      </Box>
                    }
                  />
                  <Tooltip title="Verificar hash">
                    <IconButton
                      onClick={() => {
                        const isValid = BlockchainService.validateRecord(record.hash);
                        alert(isValid ? 'Hash válido!' : 'Hash inválido!');
                      }}
                    >
                      <VerifiedIcon color={BlockchainService.validateRecord(record.hash) ? 'success' : 'error'} />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Dialog para preview de foto */}
      <Dialog
        open={photoPreviewOpen}
        onClose={() => setPhotoPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">
            📸 Evidência Fotográfica
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedPhoto && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={selectedPhoto}
                alt="Evidência fotográfica"
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhotoPreviewOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrackingDetails;
