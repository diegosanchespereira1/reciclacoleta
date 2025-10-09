import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  GetApp as DownloadIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { ReportFilters, ReportData, User } from '../types';
import { ReportService } from '../services/reportService';
import { PDFService } from '../services/pdfService';
import { useAuth } from '../contexts/AuthContext';
import Charts from './Charts';

interface ReportsProps {
  onBack: () => void;
}

const Reports: React.FC<ReportsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [collectors, setCollectors] = useState<User[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Refs para capturar os gráficos
  const chartRefs = useRef<React.RefObject<HTMLDivElement | null>[]>([]);
  
  // Inicializar refs
  useEffect(() => {
    chartRefs.current = Array.from({ length: 6 }, () => React.createRef<HTMLDivElement | null>());
  }, []);

  useEffect(() => {
    loadInitialData();
    generateReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInitialData = async () => {
    try {
      const collectorsData = ReportService.getCollectors();
      setCollectors(collectorsData);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const data = ReportService.generateReport(
        filters,
        user?.role || 'collector',
        user?.id
      );
      setReportData(data);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof ReportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleGeneratePDF = async () => {
    if (!reportData) return;

    setGeneratingPDF(true);
    try {
      await PDFService.generateReportPDF(
        reportData,
        filters,
        `Relatório de Coletas - ${user?.role === 'admin' ? 'Administrador' : 'Coletor'}`,
        true,
        true,
        user?.role === 'admin',
        chartRefs.current
      );
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getMaterialTypeLabel = (type: string) => {
    return ReportService.getMaterialTypeLabel(type);
  };

  const getStatusLabel = (status: string) => {
    return ReportService.getStatusLabel(status);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'collected': 'primary',
      'processed': 'info',
      'disposed': 'success'
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} sx={{ color: '#2e7d32' }} />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={onBack} sx={{ color: '#2e7d32' }}>
              <ArrowBackIcon />
            </IconButton>
            <AssessmentIcon sx={{ fontSize: 32, color: '#2e7d32' }} />
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
              📊 Relatórios
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ borderColor: '#2e7d32', color: '#2e7d32' }}
            >
              Filtros
            </Button>
            <Button
              variant="contained"
              startIcon={generatingPDF ? <CircularProgress size={20} /> : <DownloadIcon />}
              onClick={handleGeneratePDF}
              disabled={!reportData || generatingPDF}
              sx={{ backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' } }}
            >
              {generatingPDF ? 'Gerando PDF...' : 'Gerar PDF'}
            </Button>
          </Stack>
        </Box>

        {/* Filtros */}
        {showFilters && (
          <Card sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
                🔍 Filtros
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <DatePicker
                    label="Data Inicial"
                    value={filters.startDate || null}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <DatePicker
                    label="Data Final"
                    value={filters.endDate || null}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                  />
                </Box>

                {user?.role === 'admin' && (
                  <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Coletor</InputLabel>
                      <Select
                        value={filters.collectorId || ''}
                        onChange={(e) => handleFilterChange('collectorId', e.target.value)}
                        label="Coletor"
                      >
                        <MenuItem value="">Todos</MenuItem>
                        {collectors.map((collector) => (
                          <MenuItem key={collector.id} value={collector.id}>
                            {collector.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Material</InputLabel>
                    <Select
                      value={filters.materialType || ''}
                      onChange={(e) => handleFilterChange('materialType', e.target.value)}
                      label="Tipo de Material"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      <MenuItem value="papel">Papel</MenuItem>
                      <MenuItem value="plastico">Plástico</MenuItem>
                      <MenuItem value="vidro">Vidro</MenuItem>
                      <MenuItem value="metal">Metal</MenuItem>
                      <MenuItem value="organico">Orgânico</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.status || ''}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      <MenuItem value="collected">Coletado</MenuItem>
                      <MenuItem value="processed">Processado</MenuItem>
                      <MenuItem value="disposed">Descartado</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Localização"
                    value={filters.location || ''}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    placeholder="Digite parte do nome da localização"
                  />
                </Box>

                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
                    <Button
                      variant="contained"
                      onClick={generateReport}
                      startIcon={<RefreshIcon />}
                      sx={{ backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' } }}
                    >
                      Aplicar
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={clearFilters}
                      sx={{ borderColor: '#2e7d32', color: '#2e7d32' }}
                    >
                      Limpar
                    </Button>
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Resumo */}
        {reportData && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Card sx={{ backgroundColor: '#e8f5e8', border: '1px solid #4caf50' }}>
                <CardContent>
                  <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    {reportData.totalCollections}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                    Total de Coletas
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Card sx={{ backgroundColor: '#e3f2fd', border: '1px solid #2196f3' }}>
                <CardContent>
                  <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    {reportData.totalWeight.toFixed(1)} kg
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1976d2' }}>
                    Peso Total
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Card sx={{ backgroundColor: '#fff3e0', border: '1px solid #ff9800' }}>
                <CardContent>
                  <Typography variant="h4" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                    {Object.keys(reportData.collectionsByType).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#f57c00' }}>
                    Tipos de Material
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Card sx={{ backgroundColor: '#f3e5f5', border: '1px solid #9c27b0' }}>
                <CardContent>
                  <Typography variant="h4" sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>
                    {Object.keys(reportData.collectionsByLocation).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7b1fa2' }}>
                    Localizações
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}

        {/* Gráficos */}
        {reportData && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
                📈 Gráficos e Visualizações
              </Typography>
              <Charts 
                data={reportData} 
                showCollectorDetails={user?.role === 'admin'} 
                chartRefs={chartRefs.current}
              />
            </CardContent>
          </Card>
        )}

        {/* Tabelas Detalhadas */}
        {reportData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {/* Coletas por Tipo */}
              <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
                      📦 Coletas por Tipo de Material
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell><strong>Tipo</strong></TableCell>
                            <TableCell align="right"><strong>Quantidade</strong></TableCell>
                            <TableCell align="right"><strong>Peso (kg)</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(reportData.collectionsByType).map(([type, count]) => (
                            <TableRow key={type}>
                              <TableCell>{getMaterialTypeLabel(type)}</TableCell>
                              <TableCell align="right">{count}</TableCell>
                              <TableCell align="right">
                                {reportData.weightByType[type]?.toFixed(2) || '0.00'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>

              {/* Status das Coletas */}
              <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
                      🏷️ Status das Coletas
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="right"><strong>Quantidade</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(reportData.collectionsByStatus).map(([status, count]) => (
                            <TableRow key={status}>
                              <TableCell>
                                <Chip
                                  label={getStatusLabel(status)}
                                  color={getStatusColor(status)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="right">{count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {/* Coletas por Coletor (apenas para admin) */}
            {user?.role === 'admin' && (
              <Box sx={{ width: '100%' }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32' }}>
                      👥 Coletas por Coletor
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell><strong>Coletor</strong></TableCell>
                            <TableCell align="right"><strong>Quantidade</strong></TableCell>
                            <TableCell align="right"><strong>Peso Total (kg)</strong></TableCell>
                            <TableCell align="right"><strong>Peso Médio (kg)</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.values(reportData.collectionsByCollector).map((collector, index) => (
                            <TableRow key={index}>
                              <TableCell>{collector.name}</TableCell>
                              <TableCell align="right">{collector.count}</TableCell>
                              <TableCell align="right">{collector.weight.toFixed(2)}</TableCell>
                              <TableCell align="right">
                                {(collector.weight / collector.count).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        )}

        {!reportData && (
          <Alert severity="info" sx={{ mt: 3 }}>
            Nenhum dado encontrado para os filtros aplicados.
          </Alert>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default Reports;
