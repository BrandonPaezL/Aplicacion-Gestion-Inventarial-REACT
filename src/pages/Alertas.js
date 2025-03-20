import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Divider,
  Alert,
  Tooltip,
  Badge,
  Tab,
  Tabs,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  AlertTitle,
  useTheme
} from '@mui/material';
import {
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  CalendarMonth as CalendarIcon,
  NotificationsActive as AlertIcon,
  Timeline as TimelineIcon,
  FilterList as FilterIcon,
  Notifications as NotificationsIcon,
  ArrowForward as ArrowIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { requestNotificationPermission, sendNotification } from '../utils/notifications';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import apiService from '../services/api';

dayjs.locale('es');

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

const STOCK_MINIMO = 10;
const MESES_VENCIMIENTO = 3;

const ubicaciones = [
  { value: 'todas', label: 'Todas' },
  { value: 'bodega_principal', label: 'Bodega Principal' },
  { value: 'bodega_fria', label: 'Bodega Fría' },
  { value: 'farmacia', label: 'Farmacia' },
  { value: 'consultorio', label: 'Consultorio' },
  { value: 'emergencia', label: 'Sala de Emergencia' }
];

const categorias = [
  { value: 'todas', label: 'Todas' },
  { value: 'medicamentos', label: 'Medicamentos' },
  { value: 'insumos', label: 'Insumos Médicos' },
  { value: 'equipos', label: 'Equipos Médicos' },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'clinicos', label: 'Clínicos' }
];

const Alertas = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const { enqueueSnackbar } = useSnackbar();
  const [filtros, setFiltros] = useState({
    categoria: 'todas',
    ubicacion: 'todas',
    severidad: 'todas'
  });
  const [recordatorios, setRecordatorios] = useState([]);
  const [openRecordatorio, setOpenRecordatorio] = useState(false);
  const [nuevoRecordatorio, setNuevoRecordatorio] = useState({
    titulo: '',
    fecha: dayjs().format('YYYY-MM-DD'),
    descripcion: '',
    producto_id: ''
  });
  const [historicoDatos, setHistoricoDatos] = useState([]);
  const [periodoGrafico, setPeriodoGrafico] = useState('6m');
  const [loadingRecordatorio, setLoadingRecordatorio] = useState(false);
  const theme = useTheme();

  const opcionesPeriodo = [
    { value: '3m', label: 'Últimos 3 meses' },
    { value: '6m', label: 'Últimos 6 meses' },
    { value: '1y', label: 'Último año' }
  ];

  useEffect(() => {
    const initializeNotifications = async () => {
      const permissionGranted = await requestNotificationPermission();
      if (permissionGranted) {
        sendNotification('Sistema de Alertas Activo', {
          body: 'Recibirás notificaciones de productos por vencer y stock bajo'
        });
      }
    };

    initializeNotifications();
    fetchData();
  }, []);

  useEffect(() => {
    fetchHistoricoDatos();
  }, [periodoGrafico]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [productosData, stockBajo, porVencer, recordatoriosData] = await Promise.all([
        apiService.getProductos(),
        apiService.getProductosStockBajo(),
        apiService.getProductosPorVencer(),
        apiService.getRecordatorios()
      ]);

      // Marcar productos con alertas
      const productosConAlertas = productosData.map(producto => ({
        ...producto,
        stockBajo: stockBajo.some(p => p.id === producto.id),
        porVencer: porVencer.some(p => p.id === producto.id)
      }));

      setProductos(productosConAlertas);
      setRecordatorios(recordatoriosData);
    } catch (err) {
      console.error('Error al cargar los datos:', err);
      setError('Error al cargar los datos. Por favor, intente nuevamente.');
      enqueueSnackbar('Error al cargar los datos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricoDatos = async () => {
    try {
      const data = await apiService.getHistorico(periodoGrafico);
      setHistoricoDatos(data);
    } catch (error) {
      console.error('Error al obtener datos históricos:', error);
      enqueueSnackbar('Error al cargar el histórico de datos', { variant: 'error' });
    }
  };

  const handleCrearRecordatorio = async () => {
    try {
      if (!nuevoRecordatorio.titulo || !nuevoRecordatorio.fecha) {
        enqueueSnackbar('Por favor complete los campos requeridos', { variant: 'warning' });
        return;
      }

      setLoadingRecordatorio(true);
      console.log('Enviando recordatorio:', nuevoRecordatorio);
      
      const response = await apiService.crearRecordatorio(nuevoRecordatorio);
      console.log('Respuesta del servidor:', response);
      
      enqueueSnackbar('Recordatorio creado exitosamente', { variant: 'success' });
      setOpenRecordatorio(false);
      setNuevoRecordatorio({
        titulo: '',
        fecha: dayjs().format('YYYY-MM-DD'),
        descripcion: '',
        producto_id: null
      });
      fetchData();
    } catch (error) {
      console.error('Error completo:', error);
      const mensajeError = error.response?.data?.error || error.message || 'Error al crear el recordatorio';
      enqueueSnackbar(mensajeError, { variant: 'error' });
    } finally {
      setLoadingRecordatorio(false);
    }
  };

  const handleEliminarRecordatorio = async (id) => {
    try {
      await apiService.eliminarRecordatorio(id);
      enqueueSnackbar('Recordatorio eliminado exitosamente', { variant: 'success' });
      fetchData();
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
      enqueueSnackbar('Error al eliminar el recordatorio', { variant: 'error' });
    }
  };

  const getProductosPorVencer = () => {
    return productos.filter(producto => producto.porVencer)
      .sort((a, b) => dayjs(a.fecha_vencimiento).diff(dayjs(b.fecha_vencimiento)));
  };

  const getProductosStockBajo = () => {
    return productos.filter(producto => producto.stockBajo)
      .sort((a, b) => a.cantidad - b.cantidad);
  };

  const productosPorVencer = useMemo(getProductosPorVencer, [productos]);
  const productosStockBajo = useMemo(getProductosStockBajo, [productos]);
  const totalAlertas = productosPorVencer.length + productosStockBajo.length;

  const getDiasRestantes = (fecha) => {
    if (!fecha) return null;
    return dayjs(fecha).diff(dayjs(), 'day');
  };

  const getColorSeveridad = (dias) => {
    if (dias === null) return 'default';
    if (dias <= 0) return 'error';
    if (dias <= 7) return 'error';
    if (dias <= 15) return 'warning';
    return 'info';
  };

  const getLabelVencimiento = (fecha) => {
    const dias = getDiasRestantes(fecha);
    if (dias === null) return 'Sin fecha';
    if (dias < 0) return 'CADUCADO';
    if (dias === 0) return 'POR CADUCAR';
    return `Vence en ${dias} días`;
  };

  const getColorStock = (cantidad) => {
    if (cantidad <= 5) return 'error';
    if (cantidad <= 10) return 'warning';
    return 'info';
  };

  const datosGrafico = useMemo(() => {
    if (!historicoDatos.length) return null;

    return {
      labels: historicoDatos.map(dato => dayjs(dato.fecha).format('DD/MM/YYYY')),
      datasets: [
        {
          label: 'Stock Promedio',
          data: historicoDatos.map(dato => dato.stock_promedio),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Productos por Vencer',
          data: historicoDatos.map(dato => dato.productos_por_vencer),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
          fill: true,
          yAxisID: 'y1'
        }
      ]
    };
  }, [historicoDatos]);

  const opcionesGrafico = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Stock Promedio'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Productos por Vencer'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Histórico de Stock y Vencimientos'
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card 
            sx={{ 
              p: 3,
              mb: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                backgroundColor: theme.palette.error.main,
                borderRadius: '4px 0 0 4px'
              },
              border: 1,
              borderColor: 'divider'
            }}
          >
            <CardContent>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <AlertIcon sx={{ fontSize: 24, mr: 1, color: theme.palette.error.main }} />
                  Panel de Alertas
                </Typography>
                <Tabs 
                  value={activeTab} 
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  sx={{
                    '& .MuiTab-root': {
                      minHeight: 48,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }
                  }}
                >
                  <Tab 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>Todas las Alertas</Typography>
                        {totalAlertas > 0 && (
                          <Chip 
                            size="small" 
                            label={totalAlertas} 
                            color="error" 
                            sx={{ ml: 1, height: 20 }} 
                          />
                        )}
                      </Box>
                    } 
                  />
                  <Tab 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>Por Vencer</Typography>
                        {productosPorVencer.length > 0 && (
                          <Chip 
                            size="small" 
                            label={productosPorVencer.length} 
                            color="warning" 
                            sx={{ ml: 1, height: 20 }} 
                          />
                        )}
                      </Box>
                    }
                  />
                  <Tab 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>Stock Bajo</Typography>
                        {productosStockBajo.length > 0 && (
                          <Chip 
                            size="small" 
                            label={productosStockBajo.length} 
                            color="error" 
                            sx={{ ml: 1, height: 20 }} 
                          />
                        )}
                      </Box>
                    }
                  />
                  <Tab 
                    label="Histórico"
                  />
                </Tabs>
              </Box>

              {/* Contenido de las pestañas */}
              <Box sx={{ mt: 2 }}>
                {activeTab === 0 && (
                  <Grid container spacing={3}>
                    {/* Sección de Productos por Vencer */}
                    {productosPorVencer.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mb: 2, color: theme.palette.warning.main }}>
                          Productos por Vencer
                        </Typography>
                        <Grid container spacing={2}>
                          {productosPorVencer.map((producto) => (
                            <Grid item xs={12} md={4} key={`vencer-${producto.id}`}>
                              <Card 
                                sx={{
                                  position: 'relative',
                                  transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                                  '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: theme.shadows[3]
                                  },
                                  border: 1,
                                  borderColor: 'divider'
                                }}
                              >
                                <CardContent>
                                  <Typography variant="h6" gutterBottom noWrap>
                                    {producto.nombre}
                                  </Typography>
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    mb: 2,
                                    p: 1,
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                    borderRadius: 1
                                  }}>
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        fontWeight: 'medium',
                                        color: getDiasRestantes(producto.fecha_vencimiento) <= 0 
                                          ? theme.palette.error.main 
                                          : getDiasRestantes(producto.fecha_vencimiento) <= 7 
                                            ? theme.palette.warning.main 
                                            : theme.palette.info.main 
                                      }}
                                    >
                                      {getLabelVencimiento(producto.fecha_vencimiento)}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                    <Typography variant="body1">
                                      Stock: {producto.cantidad}
                                    </Typography>
                                  </Box>
                                  {producto.categoria && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                      Categoría: {producto.categoria}
                                    </Typography>
                                  )}
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                    )}

                    {/* Sección de Productos con Stock Bajo */}
                    {productosStockBajo.length > 0 && (
                      <Grid item xs={12} sx={{ mt: 4 }}>
                        <Typography variant="h6" sx={{ mb: 2, color: theme.palette.error.main }}>
                          Productos con Stock Bajo
                        </Typography>
                        <Grid container spacing={2}>
                          {productosStockBajo.map((producto) => (
                            <Grid item xs={12} md={4} key={`stock-${producto.id}`}>
                              <Card 
                                sx={{
                                  position: 'relative',
                                  transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                                  '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: theme.shadows[3]
                                  },
                                  border: 1,
                                  borderColor: 'divider'
                                }}
                              >
                                <CardContent>
                                  <Typography variant="h6" gutterBottom noWrap>
                                    {producto.nombre}
                                  </Typography>
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    mb: 2,
                                    p: 1,
                                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                    borderRadius: 1
                                  }}>
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        fontWeight: 'medium',
                                        color: producto.cantidad <= 5 
                                          ? theme.palette.error.main 
                                          : theme.palette.warning.main 
                                      }}
                                    >
                                      Stock Bajo: {producto.cantidad} unidades
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      Stock Mínimo: {STOCK_MINIMO}
                                    </Typography>
                                  </Box>
                                  {producto.categoria && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                      Categoría: {producto.categoria}
                                    </Typography>
                                  )}
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                    )}

                    {productosPorVencer.length === 0 && productosStockBajo.length === 0 && (
                      <Grid item xs={12}>
                        <Alert 
                          severity="success"
                          icon={<CheckCircleIcon fontSize="large" />}
                          sx={{ 
                            py: 2,
                            display: 'flex',
                            alignItems: 'center',
                            '& .MuiAlert-icon': {
                              fontSize: '2rem'
                            }
                          }}
                        >
                          <AlertTitle sx={{ fontSize: '1.1rem' }}>¡Todo en orden!</AlertTitle>
                          No hay alertas pendientes en este momento
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                )}

                {activeTab === 1 && (
                  <Box>
                    <Grid container spacing={3}>
                      {productosPorVencer.length > 0 ? (
                        productosPorVencer.map((producto) => (
                          <Grid item xs={12} md={4} key={producto.id}>
                            <Card 
                              sx={{
                                position: 'relative',
                                transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: theme.shadows[3]
                                },
                                border: 1,
                                borderColor: 'divider'
                              }}
                            >
                              <CardContent>
                                <Typography variant="h6" gutterBottom noWrap>
                                  {producto.nombre}
                                </Typography>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1,
                                  mb: 2,
                                  p: 1,
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                  borderRadius: 1
                                }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 'medium',
                                      color: getDiasRestantes(producto.fecha_vencimiento) <= 0 
                                        ? theme.palette.error.main 
                                        : getDiasRestantes(producto.fecha_vencimiento) <= 7 
                                          ? theme.palette.warning.main 
                                          : theme.palette.info.main 
                                    }}
                                  >
                                    {getLabelVencimiento(producto.fecha_vencimiento)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                  <Typography variant="body1">
                                    Stock: {producto.cantidad}
                                  </Typography>
                                </Box>
                                {producto.categoria && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Categoría: {producto.categoria}
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))
                      ) : (
                        <Grid item xs={12}>
                          <Alert 
                            severity="success"
                            icon={<CheckCircleIcon fontSize="large" />}
                            sx={{ 
                              py: 2,
                              display: 'flex',
                              alignItems: 'center',
                              '& .MuiAlert-icon': {
                                fontSize: '2rem'
                              }
                            }}
                          >
                            <AlertTitle sx={{ fontSize: '1.1rem' }}>¡Todo en orden!</AlertTitle>
                            No hay productos por vencer en este momento
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {activeTab === 2 && (
                  <Box>
                    <Grid container spacing={3}>
                      {productosStockBajo.length > 0 ? (
                        productosStockBajo.map((producto) => (
                          <Grid item xs={12} md={4} key={producto.id}>
                            <Card 
                              sx={{
                                position: 'relative',
                                transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: theme.shadows[3]
                                },
                                border: 1,
                                borderColor: 'divider'
                              }}
                            >
                              <CardContent>
                                <Typography variant="h6" gutterBottom noWrap>
                                  {producto.nombre}
                                </Typography>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1,
                                  mb: 2,
                                  p: 1,
                                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                  borderRadius: 1
                                }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 'medium',
                                      color: producto.cantidad <= 5 
                                        ? theme.palette.error.main 
                                        : theme.palette.warning.main 
                                    }}
                                  >
                                    Stock Bajo: {producto.cantidad} unidades
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Stock Mínimo: {STOCK_MINIMO}
                                  </Typography>
                                </Box>
                                {producto.categoria && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Categoría: {producto.categoria}
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))
                      ) : (
                        <Grid item xs={12}>
                          <Alert 
                            severity="success"
                            icon={<CheckCircleIcon fontSize="large" />}
                            sx={{ 
                              py: 2,
                              display: 'flex',
                              alignItems: 'center',
                              '& .MuiAlert-icon': {
                                fontSize: '2rem'
                              }
                            }}
                          >
                            <AlertTitle sx={{ fontSize: '1.1rem' }}>¡Todo en orden!</AlertTitle>
                            No hay productos con stock bajo en este momento
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {activeTab === 3 && (
                  <Box>
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <FormControl size="small" sx={{ width: 200 }}>
                        <InputLabel>Período</InputLabel>
                        <Select
                          value={periodoGrafico}
                          label="Período"
                          onChange={(e) => setPeriodoGrafico(e.target.value)}
                        >
                          <MenuItem value="3m">Últimos 3 meses</MenuItem>
                          <MenuItem value="6m">Últimos 6 meses</MenuItem>
                          <MenuItem value="1y">Último año</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    {datosGrafico ? (
                      <Box sx={{ height: 400 }}>
                        <Line data={datosGrafico} options={opcionesGrafico} />
                      </Box>
                    ) : (
                      <Alert severity="info">No hay datos históricos disponibles</Alert>
                    )}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card 
            sx={{ 
              p: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                backgroundColor: theme.palette.info.main,
                borderRadius: '4px 0 0 4px'
              },
              border: 1,
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <NotificationsIcon sx={{ fontSize: 20, mr: 1, color: theme.palette.info.main }} />
                Recordatorios
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenRecordatorio(true)}
                color="info"
              >
                Nuevo Recordatorio
              </Button>
            </Box>

            {recordatorios.length === 0 ? (
              <Alert severity="info">No hay recordatorios programados</Alert>
            ) : (
              <List>
                {recordatorios.map((recordatorio) => (
                  <ListItem
                    key={recordatorio.id}
                    sx={{
                      mb: 1,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[1]
                      }
                    }}
                  >
                    <ListItemText
                      primary={recordatorio.titulo}
                      secondary={
                        <Box component="span">
                          <Typography component="span" variant="body2" color="text.primary" display="block">
                            {dayjs(recordatorio.fecha).format('DD/MM/YYYY')}
                          </Typography>
                          {recordatorio.descripcion && (
                            <Typography component="span" variant="body2" color="text.secondary" display="block">
                              {recordatorio.descripcion}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleEliminarRecordatorio(recordatorio.id)}
                        sx={{ 
                          color: theme.palette.error.main,
                          '&:hover': {
                            backgroundColor: theme.palette.error.main + '1A'
                          }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={openRecordatorio}
        onClose={() => !loadingRecordatorio && setOpenRecordatorio(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: 1,
            borderColor: 'divider'
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center'
        }}>
          <AddIcon sx={{ mr: 1, color: theme.palette.info.main }} />
          Nuevo Recordatorio
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Título"
            fullWidth
            value={nuevoRecordatorio.titulo}
            onChange={(e) => setNuevoRecordatorio({ ...nuevoRecordatorio, titulo: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Fecha"
            type="date"
            fullWidth
            value={nuevoRecordatorio.fecha}
            onChange={(e) => setNuevoRecordatorio({ ...nuevoRecordatorio, fecha: e.target.value })}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Descripción"
            fullWidth
            multiline
            rows={4}
            value={nuevoRecordatorio.descripcion}
            onChange={(e) => setNuevoRecordatorio({ ...nuevoRecordatorio, descripcion: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={() => setOpenRecordatorio(false)} 
            disabled={loadingRecordatorio}
            sx={{ 
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: theme.palette.action.hover
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCrearRecordatorio}
            variant="contained"
            disabled={loadingRecordatorio}
            startIcon={loadingRecordatorio ? <CircularProgress size={20} /> : null}
            color="info"
          >
            {loadingRecordatorio ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Alertas;
