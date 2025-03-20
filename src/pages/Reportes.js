import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Box,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from "@mui/material";
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  SwapHoriz as SwapHorizIcon,
  CalendarMonth as CalendarMonthIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import dayjs from "dayjs";

// Importaciones de Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Reportes = () => {
  const theme = useTheme();
  const [reportes, setReportes] = useState([]);
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [nuevoReporte, setNuevoReporte] = useState({
    tipo: "",
    fechaInicio: "",
    fechaFin: "",
    categoria: "todas",
    formato: "pdf",
    filtros: {
      destinatario: "todos",
      frecuencia: "todas",
      estado: "todos"
    }
  });
  const [estadisticas, setEstadisticas] = useState({
    totalReportes: 0,
    reportesMes: 0,
    categoriasMasReportadas: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tiposReporte = [
    { value: "inventario", label: "Inventario Actual", icon: <InventoryIcon /> },
    { value: "movimientos", label: "Registro de Movimientos", icon: <SwapHorizIcon /> },
    { value: "cronograma", label: "Cronograma de Entregas", icon: <CalendarMonthIcon /> },
    { value: "vencimientos", label: "Productos por Vencer", icon: <WarningIcon /> },
    { value: "historico", label: "Histórico de Stock", icon: <TrendingUpIcon /> }
  ];

  useEffect(() => {
    fetchReportes();
    calcularEstadisticas();
  }, []);

  const fetchReportes = async () => {
    try {
      const response = await axios.get("http://localhost:5000/reportes");
      setReportes(response.data);
    } catch (error) {
      console.error("Error al obtener reportes:", error);
    }
  };

  const calcularEstadisticas = () => {
    const mesActual = dayjs().format('YYYY-MM');
    
    setEstadisticas({
      totalReportes: reportes.length,
      reportesMes: reportes.filter(r => 
        dayjs(r.fecha).format('YYYY-MM') === mesActual
      ).length,
      categoriasMasReportadas: obtenerCategoriasMasReportadas()
    });
  };

  const obtenerCategoriasMasReportadas = () => {
    const categorias = {};
    reportes.forEach(reporte => {
      if (categorias[reporte.categoria]) {
        categorias[reporte.categoria]++;
      } else {
        categorias[reporte.categoria] = 1;
      }
    });

    return Object.entries(categorias)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
  };

  const handleGenerarReporte = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = 'http://localhost:5000/reportes/generar';
      let data = { ...nuevoReporte };

      // Ajustar el endpoint según el tipo de reporte
      switch (nuevoReporte.tipo) {
        case 'movimientos':
          endpoint = 'http://localhost:5000/reportes/movimientos';
          break;
        case 'cronograma':
          endpoint = 'http://localhost:5000/reportes/cronograma';
          break;
        case 'vencimientos':
          endpoint = 'http://localhost:5000/reportes/vencimientos';
          break;
        case 'historico':
          endpoint = 'http://localhost:5000/reportes/historico';
          break;
        default:
          endpoint = 'http://localhost:5000/reportes/generar';
      }

      const response = await axios.post(endpoint, data, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        window.location.href = `http://localhost:5000/reportes/${response.data.archivo}`;
        setOpenDialog(false);
        alert('Reporte generado exitosamente');
        fetchReportes();
      } else {
        throw new Error(response.data.error || 'Error al generar el reporte');
      }

    } catch (error) {
      console.error('Error completo:', error);
      setError(
        error.response?.data?.error || 
        error.message || 
        'Error al generar el reporte'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await axios.get(`http://localhost:5000/reportes/${id}/download`, {
        responseType: 'blob'
      });
      
      const contentType = response.headers['content-type'];
      const extension = contentType.includes('pdf') ? 'pdf' : 'xlsx';
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte-${id}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar reporte:", error);
    }
  };

  const filteredReportes = reportes.filter((reporte) =>
    reporte.nombre.toLowerCase().includes(search.toLowerCase())
  );

  // Configuración del gráfico
  const chartData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Reportes Generados',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: theme.palette.primary.main + '40',
        borderColor: theme.palette.primary.main,
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Reportes Generados por Mes',
        color: theme.palette.text.primary,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: theme.palette.text.secondary,
        },
        grid: {
          color: theme.palette.divider,
        },
      },
      x: {
        ticks: {
          color: theme.palette.text.secondary,
        },
        grid: {
          color: theme.palette.divider,
        },
      },
    },
  };

  const renderFiltrosAdicionales = () => {
    switch (nuevoReporte.tipo) {
      case 'movimientos':
        return (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={nuevoReporte.filtros.estado}
              onChange={(e) => setNuevoReporte({
                ...nuevoReporte,
                filtros: { ...nuevoReporte.filtros, estado: e.target.value }
              })}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="creacion">Creaciones</MenuItem>
              <MenuItem value="modificacion">Modificaciones</MenuItem>
              <MenuItem value="eliminacion">Eliminaciones</MenuItem>
            </Select>
          </FormControl>
        );
      case 'cronograma':
        return (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Frecuencia</InputLabel>
              <Select
                value={nuevoReporte.filtros.frecuencia}
                onChange={(e) => setNuevoReporte({
                  ...nuevoReporte,
                  filtros: { ...nuevoReporte.filtros, frecuencia: e.target.value }
                })}
              >
                <MenuItem value="todas">Todas</MenuItem>
                <MenuItem value="semanal">Semanal</MenuItem>
                <MenuItem value="quincenal">Quincenal</MenuItem>
                <MenuItem value="mensual">Mensual</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Destinatario</InputLabel>
              <Select
                value={nuevoReporte.filtros.destinatario}
                onChange={(e) => setNuevoReporte({
                  ...nuevoReporte,
                  filtros: { ...nuevoReporte.filtros, destinatario: e.target.value }
                })}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="almacen">Almacén</MenuItem>
                <MenuItem value="ventas">Ventas</MenuItem>
                <MenuItem value="produccion">Producción</MenuItem>
              </Select>
            </FormControl>
          </>
        );
      case 'vencimientos':
        return (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Rango de Vencimiento</InputLabel>
            <Select
              value={nuevoReporte.filtros.estado}
              onChange={(e) => setNuevoReporte({
                ...nuevoReporte,
                filtros: { ...nuevoReporte.filtros, estado: e.target.value }
              })}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="proximo">Próximo a vencer (30 días)</MenuItem>
              <MenuItem value="vencido">Vencido</MenuItem>
            </Select>
          </FormControl>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Estadísticas Generales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              backgroundColor: theme.palette.primary.main,
              borderRadius: '4px 0 0 4px'
            },
            border: 1,
            borderColor: 'divider',
            '&:hover': {
              boxShadow: theme.shadows[4],
              transform: 'translateY(-4px)',
              transition: 'all 0.3s'
            }
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                Total de Reportes
              </Typography>
              <Typography variant="h4" color="primary">
                {estadisticas.totalReportes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              backgroundColor: theme.palette.success.main,
              borderRadius: '4px 0 0 4px'
            },
            border: 1,
            borderColor: 'divider',
            '&:hover': {
              boxShadow: theme.shadows[4],
              transform: 'translateY(-4px)',
              transition: 'all 0.3s'
            }
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                Reportes este mes
              </Typography>
              <Typography variant="h4" color="success.main">
                {estadisticas.reportesMes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
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
            borderColor: 'divider',
            '&:hover': {
              boxShadow: theme.shadows[4],
              transform: 'translateY(-4px)',
              transition: 'all 0.3s'
            }
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CategoryIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                Categoría más reportada
              </Typography>
              <Typography variant="h4" color="info.main">
                {estadisticas.categoriasMasReportadas[0]?.[0] || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Contenedor Principal */}
      <Card sx={{ 
        mb: 4,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          backgroundColor: theme.palette.primary.main,
          borderRadius: '4px 0 0 4px'
        },
        border: 1,
        borderColor: 'divider'
      }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <DescriptionIcon sx={{ fontSize: 24, mr: 1, color: theme.palette.primary.main }} />
            Gestión de Reportes
          </Typography>

          {/* Barra de búsqueda y botón de nuevo reporte */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="Buscar reporte..."
              variant="outlined"
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                  </InputAdornment>
                ),
              }}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={() => setOpenDialog(true)}
              startIcon={<DescriptionIcon />}
              sx={{
                minWidth: '180px',
                bgcolor: theme.palette.primary.main,
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                }
              }}
            >
              Nuevo Reporte
            </Button>
          </Box>

          {/* Tabla de Reportes */}
          <TableContainer 
            component={Paper}
            sx={{ 
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              '& .MuiTableCell-head': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                fontWeight: 'bold'
              }
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Formato</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReportes.map((reporte) => (
                  <TableRow 
                    key={reporte.id}
                    sx={{
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      }
                    }}
                  >
                    <TableCell>{reporte.id}</TableCell>
                    <TableCell>{reporte.nombre}</TableCell>
                    <TableCell>{dayjs(reporte.fecha).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>{reporte.tipo}</TableCell>
                    <TableCell>{reporte.formato}</TableCell>
                    <TableCell align="center">
                      <IconButton 
                        color="primary" 
                        onClick={() => handleDownload(reporte.id)}
                        sx={{ 
                          '&:hover': { 
                            bgcolor: theme.palette.primary.main + '1A'
                          }
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Reportes */}
      <Card sx={{ 
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
          backgroundColor: theme.palette.success.main,
          borderRadius: '4px 0 0 4px'
        },
        border: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <TrendingUpIcon sx={{ fontSize: 24, mr: 1, color: theme.palette.success.main }} />
          Tendencia de Reportes Generados
        </Typography>
        <Box sx={{ height: 300 }}>
          <Bar data={chartData} options={chartOptions} />
        </Box>
      </Card>

      {/* Diálogo para nuevo reporte */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
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
          <DescriptionIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          Generar Nuevo Reporte
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Tipo de Reporte</InputLabel>
            <Select
              value={nuevoReporte.tipo}
              onChange={(e) => setNuevoReporte({ ...nuevoReporte, tipo: e.target.value })}
            >
              {tiposReporte.map((tipo) => (
                <MenuItem key={tipo.value} value={tipo.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tipo.icon}
                    {tipo.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {nuevoReporte.tipo && (
            <>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Formato</InputLabel>
                <Select
                  value={nuevoReporte.formato}
                  onChange={(e) => setNuevoReporte({ ...nuevoReporte, formato: e.target.value })}
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="excel">Excel</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Fecha Inicio"
                type="date"
                value={nuevoReporte.fechaInicio}
                onChange={(e) => setNuevoReporte({ ...nuevoReporte, fechaInicio: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Fecha Fin"
                type="date"
                value={nuevoReporte.fechaFin}
                onChange={(e) => setNuevoReporte({ ...nuevoReporte, fechaFin: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              {renderFiltrosAdicionales()}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={() => setOpenDialog(false)} 
            disabled={loading}
            sx={{ 
              color: theme.palette.text.secondary,
              '&:hover': {
                bgcolor: theme.palette.action.hover
              }
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerarReporte} 
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              }
            }}
          >
            {loading ? 'Generando...' : 'Generar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Reportes;
