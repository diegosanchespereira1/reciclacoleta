import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  PhotoLibrary as LibraryIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

interface PhotoCaptureProps {
  onPhotoCapture: (photoData: string, photoHash: string) => void;
  onPhotoRemove: () => void;
  currentPhoto?: string;
  currentHash?: string;
  required?: boolean;
  disabled?: boolean;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoCapture,
  onPhotoRemove,
  currentPhoto,
  currentHash,
  required = false,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Simular captura de foto (em um app real, usaria a API de câmera)
  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, source: 'camera' | 'file') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    // Validar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 5MB.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const photoData = await convertFileToBase64(file);
      const photoHash = await generatePhotoHash(photoData);
      
      onPhotoCapture(photoData, photoHash);
      
      // Resetar inputs após processamento bem-sucedido
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    } catch (err) {
      setError('Erro ao processar a imagem. Tente novamente.');
      console.error('Erro ao processar foto:', err);
    } finally {
      setLoading(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        
        // Verificar tamanho da string Base64
        // Se for muito grande (>2MB em Base64), comprimir
        if (result.length > 2 * 1024 * 1024) {
          compressImage(result)
            .then(compressed => resolve(compressed))
            .catch(reject);
        } else {
          resolve(result);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        // Redimensionar se necessário (máximo 1920x1920)
        let width = img.width;
        let height = img.height;
        const maxSize = 1920;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para Base64 com qualidade reduzida (0.7 = 70%)
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = base64;
    });
  };

  const generatePhotoHash = async (photoData: string): Promise<string> => {
    // Gerar hash SHA-256 real da imagem usando Web Crypto API
    try {
      const encoder = new TextEncoder();
      const data_buffer = encoder.encode(photoData);
      const hash_buffer = await crypto.subtle.digest('SHA-256', data_buffer);
      const hash_array = Array.from(new Uint8Array(hash_buffer));
      const hash_hex = hash_array.map(b => b.toString(16).padStart(2, '0')).join('');
      return hash_hex;
    } catch (error) {
      // Fallback para hash simples se Web Crypto API não estiver disponível
      console.warn('Web Crypto API não disponível, usando hash simples');
      return generateSimpleHash(photoData);
    }
  };

  const generateSimpleHash = (input: string): string => {
    let hash = 0;
    if (input.length === 0) return hash.toString();
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'IMG-' + Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  };

  const handleRemovePhoto = () => {
    onPhotoRemove();
    setError(null);
  };

  const handlePreviewPhoto = () => {
    setPreviewOpen(true);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2, color: '#2e7d32' }}>
        📸 Evidência Fotográfica {required && <span style={{ color: 'red' }}>*</span>}
      </Typography>

      {currentPhoto ? (
        <Card sx={{ border: '2px solid #4caf50', backgroundColor: '#f1f8e9' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                  <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    Foto capturada com sucesso!
                  </Typography>
                </Box>
                <Chip
                  label={`Hash: ${currentHash}`}
                  size="small"
                  variant="outlined"
                  sx={{ color: '#2e7d32', borderColor: '#2e7d32' }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={handlePreviewPhoto}
                  sx={{ color: '#2e7d32' }}
                >
                  <ViewIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleRemovePhoto}
                  disabled={disabled}
                  sx={{ color: '#f44336' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ border: '2px dashed #ccc', backgroundColor: loading ? '#f5f5f5' : '#fafafa' }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              {loading ? (
                <Box sx={{ py: 2 }}>
                  <CircularProgress size={40} sx={{ color: '#2e7d32', mb: 2 }} />
                  <Typography variant="body1" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    Processando imagem...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gerando hash SHA-256 para verificação
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {required 
                      ? 'Foto obrigatória para rastreamento'
                      : 'Adicione uma foto como evidência (opcional)'
                    }
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<CameraIcon />}
                      onClick={handleCameraCapture}
                      disabled={disabled}
                      sx={{ borderColor: '#2e7d32', color: '#2e7d32' }}
                    >
                      Tirar Foto
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<LibraryIcon />}
                      onClick={handleFileSelect}
                      disabled={disabled}
                      sx={{ borderColor: '#2e7d32', color: '#2e7d32' }}
                    >
                      Carregar Foto
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Inputs ocultos para câmera e arquivo */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={(e) => handleFileChange(e, 'file')}
      />
      
      <input
        type="file"
        ref={cameraInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileChange(e, 'camera')}
      />

      {/* Exibir erro se houver */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Dialog para preview da foto */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">
            📸 Evidência Fotográfica
          </Typography>
        </DialogTitle>
        <DialogContent>
          {currentPhoto && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={currentPhoto}
                alt="Evidência fotográfica"
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}
              />
              {currentHash && (
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
                  Hash de verificação: {currentHash}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhotoCapture;
