import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Recycling as RecycleIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  LocationOn as LocationOnIcon,
  MyLocation as MyLocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { CollectionPointService } from '../services/collectionPointService';

interface CollectionPointFormProps {
  onBack: () => void;
}

const CollectionPointForm: React.FC<CollectionPointFormProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    responsibleName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!formData.name || !formData.responsibleName || !formData.phone || !formData.email || !formData.address || !formData.city) {
      setError('Todos os campos obrigatórios devem ser preenchidos');
      setLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email inválido');
      setLoading(false);
      return;
    }

    // Basic phone validation
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Telefone deve estar no formato (11) 99999-9999');
      setLoading(false);
      return;
    }

    try {
      await CollectionPointService.createCollectionPoint(formData);

      setSuccess(true);
      setFormData({
        name: '',
        responsibleName: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        isActive: true
      });

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError('Erro ao cadastrar ponto de coleta');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);
    setError('');

    try {
      const location = await CollectionPointService.getCurrentLocation();
      if (location) {
        setFormData(prev => ({
          ...prev,
          address: location.address,
          city: location.city
        }));
      } else {
        setError('Não foi possível obter a localização. Verifique se o GPS está ativado.');
      }
    } catch (err) {
      setError('Erro ao obter localização');
    } finally {
      setGettingLocation(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
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
            Cadastrar Ponto de Coleta
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
              ♻️ Novo Ponto de Coleta
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Cadastre um novo ponto de coleta de materiais recicláveis
            </Typography>
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Ponto de coleta cadastrado com sucesso!
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Nome do ponto de coleta */}
              <TextField
                required
                fullWidth
                id="name"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BusinessIcon sx={{ mr: 1 }} />
                    Nome do Ponto de Coleta
                  </Box>
                }
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
                placeholder="Ex: Ponto de Coleta Centro"
              />

              {/* Nome do responsável */}
              <TextField
                required
                fullWidth
                id="responsibleName"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1 }} />
                    Nome do Responsável
                  </Box>
                }
                value={formData.responsibleName}
                onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                disabled={loading}
                placeholder="Ex: Maria Silva"
              />

              {/* Telefone e Email */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  required
                  fullWidth
                  id="phone"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon sx={{ mr: 1 }} />
                      Telefone
                    </Box>
                  }
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  disabled={loading}
                  placeholder="(11) 99999-9999"
                />

                <TextField
                  required
                  fullWidth
                  id="email"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <EmailIcon sx={{ mr: 1 }} />
                      Email
                    </Box>
                  }
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                  placeholder="exemplo@email.com"
                />
              </Box>

              {/* Endereço com botão de localização */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOnIcon sx={{ color: '#666' }} />
                  <Typography variant="body2" color="text.secondary">
                    Endereço
                  </Typography>
                  <Button
                    size="small"
                    startIcon={gettingLocation ? <CircularProgress size={16} /> : <MyLocationIcon />}
                    onClick={handleGetLocation}
                    disabled={gettingLocation || loading}
                    sx={{ ml: 'auto', color: '#2e7d32' }}
                  >
                    {gettingLocation ? 'Obtendo...' : 'Usar Localização'}
                  </Button>
                </Box>
                <TextField
                  required
                  fullWidth
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={loading}
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                />
              </Box>

              {/* Cidade */}
              <TextField
                required
                fullWidth
                id="city"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationOnIcon sx={{ mr: 1 }} />
                    Cidade
                  </Box>
                }
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={loading}
                placeholder="Ex: São Paulo - SP"
              />

              {/* Status ativo */}
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    disabled={loading}
                    color="success"
                  />
                }
                label="Ponto de coleta ativo"
              />
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
                {loading ? 'Salvando...' : 'Cadastrar Ponto'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CollectionPointForm;
