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
  TablePagination,
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [periodoGrafico, setPeriodoGrafico] = useState('6meses');
  const [añoSeleccionado, setAñoSeleccionado] = useState(dayjs().year());
  const [mesSeleccionado, setMesSeleccionado] = useState(dayjs().month());
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Reportes Generados',
        data: [],
        backgroundColor: theme.palette.primary.main + '40',
        borderColor: theme.palette.primary.main,
        borderWidth: 1,
      },
    ],
  });
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
  }, []);

  useEffect(() => {
    if (reportes.length > 0) {
      calcularEstadisticas();
    }
  }, [reportes]);

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

    // Actualizar datos del gráfico
    actualizarDatosGrafico();
  };

  const actualizarDatosGrafico = () => {
    let labels = [];
    let datos = [];

    switch (periodoGrafico) {
      case '12meses':
        // Últimos 12 meses
        for (let i = 11; i >= 0; i--) {
          const mes = dayjs().subtract(i, 'month');
          labels.push(mes.format('MMM YY'));
          const reportesMes = reportes.filter(reporte => 
            dayjs(reporte.fecha).format('YYYY-MM') === mes.format('YYYY-MM')
          ).length;
          datos.push(reportesMes);
        }
        break;

      case '6meses':
        // Últimos 6 meses
        for (let i = 5; i >= 0; i--) {
          const mes = dayjs().subtract(i, 'month');
          labels.push(mes.format('MMM YY'));
          const reportesMes = reportes.filter(reporte => 
            dayjs(reporte.fecha).format('YYYY-MM') === mes.format('YYYY-MM')
          ).length;
          datos.push(reportesMes);
        }
        break;

      case 'año':
        // Meses del año seleccionado
        for (let i = 0; i < 12; i++) {
          const mes = dayjs().year(añoSeleccionado).month(i);
          labels.push(mes.format('MMM'));
          const reportesMes = reportes.filter(reporte => 
            dayjs(reporte.fecha).format('YYYY-MM') === mes.format('YYYY-MM')
          ).length;
          datos.push(reportesMes);
        }
        break;

      case 'mes':
        // Días del mes seleccionado
        const diasEnMes = dayjs().year(añoSeleccionado).month(mesSeleccionado).daysInMonth();
        for (let i = 1; i <= diasEnMes; i++) {
          const dia = dayjs().year(añoSeleccionado).month(mesSeleccionado).date(i);
          labels.push(dia.format('DD'));
          const reportesDia = reportes.filter(reporte => 
            dayjs(reporte.fecha).format('YYYY-MM-DD') === dia.format('YYYY-MM-DD')
          ).length;
          datos.push(reportesDia);
        }
        break;

      default:
        break;
    }

    setChartData({
      labels,
      datasets: [
        {
          label: 'Reportes Generados',
          data: datos,
          backgroundColor: theme.palette.primary.main + '40',
          borderColor: theme.palette.primary.main,
          borderWidth: 1,
        },
      ],
    });
  };

  useEffect(() => {
    if (reportes.length > 0) {
      actualizarDatosGrafico();
    }
  }, [reportes, periodoGrafico, añoSeleccionado, mesSeleccionado]);

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
        // Abrir en una nueva ventana en lugar de redirigir la ventana actual
        window.open(`http://localhost:5000/reportes/${response.data.archivo}`, '_blank', 'noopener,noreferrer');
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
      // Primero obtenemos la información del reporte para conocer el nombre del archivo
      const reporteInfo = reportes.find(reporte => reporte.id === id);
      
      if (!reporteInfo || !reporteInfo.nombre) {
        console.error("Error: No se encontró información del reporte");
        return;
      }
      
      // Utilizamos directamente el endpoint /reportes/:nombre como está configurado en el backend
      const url = `http://localhost:5000/reportes/${reporteInfo.nombre}`;
      
      // Abrimos el archivo en una nueva ventana especificando características
      window.open(url, '_blank', 'noopener,noreferrer');
      
      // Registramos el evento de descarga
      console.log("Descargando reporte:", reporteInfo.nombre);
    } catch (error) {
      console.error("Error al descargar reporte:", error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredReportes = reportes.filter((reporte) =>
    reporte.nombre.toLowerCase().includes(search.toLowerCase())
  );

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
        max: 35,
        ticks: {
          stepSize: 5,
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
                {filteredReportes
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((reporte) => (
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

          <TablePagination
            component="div"
            count={filteredReportes.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} de ${count}`
            }
            sx={{
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                color: 'text.secondary',
                fontSize: '0.875rem'
              }
            }}
          />
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
          <TrendingUpIcon sx={{ fontSize: 24, mr: 1, color: theme.palette.success.main }} />
          Tendencia de Reportes Generados
        </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={periodoGrafico}
                label="Período"
                onChange={(e) => setPeriodoGrafico(e.target.value)}
              >
                <MenuItem value="6meses">Últimos 6 meses</MenuItem>
                <MenuItem value="12meses">Últimos 12 meses</MenuItem>
                <MenuItem value="año">Por año</MenuItem>
                <MenuItem value="mes">Por mes</MenuItem>
              </Select>
            </FormControl>

            {periodoGrafico === 'año' && (
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Año</InputLabel>
                <Select
                  value={añoSeleccionado}
                  label="Año"
                  onChange={(e) => setAñoSeleccionado(e.target.value)}
                >
                  {Array.from({ length: 5 }, (_, i) => dayjs().year() - i).map(año => (
                    <MenuItem key={año} value={año}>{año}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {periodoGrafico === 'mes' && (
              <>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Año</InputLabel>
                  <Select
                    value={añoSeleccionado}
                    label="Año"
                    onChange={(e) => setAñoSeleccionado(e.target.value)}
                  >
                    {Array.from({ length: 5 }, (_, i) => dayjs().year() - i).map(año => (
                      <MenuItem key={año} value={año}>{año}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Mes</InputLabel>
                  <Select
                    value={mesSeleccionado}
                    label="Mes"
                    onChange={(e) => setMesSeleccionado(e.target.value)}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <MenuItem key={i} value={i}>
                        {dayjs().month(i).format('MMMM')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </Box>

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
