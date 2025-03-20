import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Stack,
  Menu,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon,
  CalendarMonth as CalendarIcon,
  NavigateNext,
  NavigateBefore,
  Circle as DotIcon,
  LocalShipping as DeliveryIcon,
  Comment as CommentIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, DateCalendar } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import { startOfWeek, endOfWeek } from 'dayjs';
import * as XLSX from 'xlsx';
import { useTheme } from '@mui/material/styles';

dayjs.locale('es');

const Cronograma = () => {
  const [openModal, setOpenModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [cronogramas, setCronogramas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [weekStart, setWeekStart] = useState(dayjs().startOf('week'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [popoverDate, setPopoverDate] = useState(null);
  const [commentAnchorEl, setCommentAnchorEl] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filters, setFilters] = useState({
    frecuencia: 'todas',
    destinatario: 'todos'
  });

  const initialFormData = {
    producto: '',
    cantidad: '',
    destinatario: '',
    fecha_entrega: dayjs(),
    frecuencia: 'mensual',
    descripcion: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});

  const theme = useTheme();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cronogramasRes, inventarioRes] = await Promise.all([
        axios.get('http://localhost:5000/cronogramas'),
        axios.get('http://localhost:5000/productos')
      ]);
      setCronogramas(cronogramasRes.data);
      setInventario(inventarioRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      enqueueSnackbar('Error al cargar los datos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.producto) errors.producto = 'El producto es requerido';
    if (!formData.cantidad) errors.cantidad = 'La cantidad es requerida';
    if (formData.cantidad <= 0) errors.cantidad = 'La cantidad debe ser mayor a 0';
    if (!formData.destinatario) errors.destinatario = 'El destinatario es requerido';
    if (!formData.fecha_entrega) errors.fecha_entrega = 'La fecha es requerida';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      enqueueSnackbar('Por favor, completa todos los campos requeridos', { variant: 'warning' });
      return;
    }

    setLoadingSave(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('user'));
      if (!userInfo || !userInfo.user) {
        enqueueSnackbar("Error: No hay usuario autenticado", { variant: "error" });
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-User-Name': userInfo.user.name,
        'X-User-Id': userInfo.user.id
      };

      const productoSeleccionado = inventario.find(item => item.nombre === formData.producto);
      
      if (!productoSeleccionado) {
        enqueueSnackbar('Producto no encontrado en inventario', { variant: 'error' });
        return;
      }

      if (productoSeleccionado.cantidad < parseInt(formData.cantidad)) {
        enqueueSnackbar('Cantidad insuficiente en inventario', { variant: 'error' });
        return;
      }

      // Registrar en auditoría antes de crear el cronograma
      await axios.post('http://localhost:5000/auditorias', {
        usuario_id: userInfo.user.id,
        usuario_nombre: userInfo.user.name,
        accion: 'creación',
        detalles: {
          tipo: 'cronograma',
          producto: formData.producto,
          cantidad: formData.cantidad,
          destinatario: formData.destinatario,
          fecha_entrega: formData.fecha_entrega.format('YYYY-MM-DD'),
          frecuencia: formData.frecuencia,
          descripcion: formData.descripcion || 'Sin descripción'
        }
      }, { headers });

      const response = await axios.post('http://localhost:5000/cronogramas', {
        ...formData,
        fecha_entrega: formData.fecha_entrega.toISOString(),
        cantidad: parseInt(formData.cantidad)
      }, { headers });

      if (response.status === 201) {
        enqueueSnackbar('Entrega programada correctamente ✅', { variant: 'success' });
        setOpenModal(false);
        setFormData(initialFormData);
        fetchData();
      }
    } catch (error) {
      console.error('Error:', error);
      enqueueSnackbar('Error al programar la entrega', { variant: 'error' });
    } finally {
      setLoadingSave(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta entrega? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      const userInfo = JSON.parse(localStorage.getItem('user'));
      if (!userInfo || !userInfo.user) {
        enqueueSnackbar("Error: No hay usuario autenticado", { variant: "error" });
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-User-Name': userInfo.user.name,
        'X-User-Id': userInfo.user.id
      };

      const cronogramaAEliminar = cronogramas.find(c => c.id === id);

      // Registrar en auditoría antes de eliminar
      await axios.post('http://localhost:5000/auditorias', {
        usuario_id: userInfo.user.id,
        usuario_nombre: userInfo.user.name,
        accion: 'eliminación',
        detalles: {
          tipo: 'cronograma',
          nombre: `Cronograma #${id}`,
          producto: cronogramaAEliminar.producto,
          cantidad: cronogramaAEliminar.cantidad,
          destinatario: cronogramaAEliminar.destinatario,
          fecha_entrega: dayjs(cronogramaAEliminar.fecha_entrega).format('YYYY-MM-DD'),
          frecuencia: cronogramaAEliminar.frecuencia
        }
      }, { headers });

      await axios.delete(`http://localhost:5000/cronogramas/${id}`, { headers });
      enqueueSnackbar('Entrega eliminada correctamente', { variant: 'success' });
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      enqueueSnackbar('Error al eliminar la entrega', { variant: 'error' });
    }
  };

  const getEntregasForDate = (date) => {
    return cronogramas.filter(cronograma => {
      const cronogramaDate = dayjs(cronograma.fecha_entrega);
      return cronogramaDate.format('YYYY-MM-DD') === date.format('YYYY-MM-DD');
    });
  };

  const getWeekDeliveries = () => {
    const start = weekStart;
    const end = weekStart.endOf('week');
    
    return cronogramas.filter(cronograma => {
      const date = dayjs(cronograma.fecha_entrega);
      return date.isAfter(start) && date.isBefore(end);
    }).sort((a, b) => dayjs(a.fecha_entrega).diff(dayjs(b.fecha_entrega)));
  };

  const navigateWeek = (direction) => {
    setWeekStart(prev => direction === 'next' 
      ? prev.add(1, 'week') 
      : prev.subtract(1, 'week')
    );
  };

  const hasDeliveries = (date) => {
    return cronogramas.some(cronograma => 
      dayjs(cronograma.fecha_entrega).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    );
  };

  const handleDayClick = (date, event) => {
    const entregas = getEntregasForDate(date);
    if (entregas.length > 0) {
      setPopoverDate(date);
      setAnchorEl(event.currentTarget);
    }
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setPopoverDate(null);
  };

  const open = Boolean(anchorEl);

  const handleCommentClick = (event, comentario) => {
    setCommentAnchorEl(event.currentTarget);
    setSelectedComment(comentario);
  };

  const handleCommentClose = () => {
    setCommentAnchorEl(null);
    setSelectedComment(null);
  };

  const commentOpen = Boolean(commentAnchorEl);

  const getEntregasCount = (date) => {
    return cronogramas.filter(cronograma => 
      dayjs(cronograma.fecha_entrega).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    ).length;
  };

  const handleExportCronograma = () => {
    const month = selectedDate.format('MMMM-YYYY');
    const data = cronogramas
      .filter(c => dayjs(c.fecha_entrega).format('MMMM-YYYY') === selectedDate.format('MMMM-YYYY'))
      .map(c => ({
        'Fecha de Entrega': dayjs(c.fecha_entrega).format('DD/MM/YYYY'),
        'Producto': c.producto,
        'Cantidad': c.cantidad,
        'Destinatario': c.destinatario,
        'Frecuencia': c.frecuencia.charAt(0).toUpperCase() + c.frecuencia.slice(1),
        'Comentarios': c.descripcion || ''
      }));

    if (data.length === 0) {
      enqueueSnackbar('No hay entregas programadas para exportar en este mes', { variant: 'info' });
      return;
    }

    try {
      // Crear un nuevo libro de trabajo
      const wb = XLSX.utils.book_new();
      
      // Crear la hoja de trabajo con los datos
      const ws = XLSX.utils.json_to_sheet([]);
      
      // Agregar título del reporte con merge de celdas
      XLSX.utils.sheet_add_aoa(ws, [[`CRONOGRAMA DE ENTREGAS - ${month.toUpperCase()}`]], { origin: 'A1' });
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
      
      // Agregar espacio entre título y datos
      XLSX.utils.sheet_add_aoa(ws, [[]], { origin: 'A2' });
      
      // Agregar los datos desde A3
      XLSX.utils.sheet_add_json(ws, data, { origin: 'A3', skipHeader: false });

      // Establecer anchos de columna
      const columnWidths = [
        { wch: 15 }, // Fecha
        { wch: 35 }, // Producto
        { wch: 12 }, // Cantidad
        { wch: 25 }, // Destinatario
        { wch: 12 }, // Frecuencia
        { wch: 40 }  // Comentarios
      ];
      ws['!cols'] = columnWidths;

      // Estilos para el título
      const titleStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
        fill: { fgColor: { rgb: "4A148C" } }, // Morado oscuro
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "medium", color: { rgb: "FFFFFF" } },
          bottom: { style: "medium", color: { rgb: "FFFFFF" } },
          left: { style: "medium", color: { rgb: "FFFFFF" } },
          right: { style: "medium", color: { rgb: "FFFFFF" } }
        }
      };

      // Estilos para los encabezados
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        fill: { fgColor: { rgb: "1976D2" } }, // Azul MUI
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "FFFFFF" } },
          bottom: { style: "thin", color: { rgb: "FFFFFF" } },
          left: { style: "thin", color: { rgb: "FFFFFF" } },
          right: { style: "thin", color: { rgb: "FFFFFF" } }
        }
      };

      // Estilo para las celdas de datos
      const dataStyle = {
        font: { sz: 11 },
        alignment: { vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "E0E0E0" } },
          bottom: { style: "thin", color: { rgb: "E0E0E0" } },
          left: { style: "thin", color: { rgb: "E0E0E0" } },
          right: { style: "thin", color: { rgb: "E0E0E0" } }
        }
      };

      // Aplicar estilos al título
      ws['A1'].s = titleStyle;

      // Aplicar estilos a los encabezados y datos
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        // Estilo para encabezados (fila 3)
        const headerAddress = XLSX.utils.encode_cell({ r: 2, c: C });
        if (ws[headerAddress]) ws[headerAddress].s = headerStyle;

        // Estilo para datos
        for (let R = 3; R <= range.e.r; ++R) {
          const dataAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[dataAddress]) {
            ws[dataAddress].s = {
              ...dataStyle,
              fill: {
                fgColor: { rgb: R % 2 === 0 ? "F5F5F5" : "FFFFFF" } // Filas alternadas
              }
            };
          }
        }
      }

      // Agregar la hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, `Entregas ${month}`);

      // Exportar el archivo
      XLSX.writeFile(wb, `cronograma-${month}.xlsx`);
      
      enqueueSnackbar('Cronograma exportado correctamente', { variant: 'success' });
    } catch (error) {
      console.error('Error al exportar:', error);
      enqueueSnackbar('Error al exportar el cronograma', { variant: 'error' });
    }
  };

  const getChipColorByFrecuencia = (frecuencia) => {
    switch (frecuencia) {
      case 'semanal':
        return 'success';
      case 'quincenal':
        return 'warning';
      case 'mensual':
        return 'primary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Card 
        sx={{ 
          p: 3,
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
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CalendarIcon sx={{ fontSize: 30, color: theme.palette.primary.main, mr: 2 }} />
          <Typography variant="h4" component="h1">
            Cronograma de Entregas
          </Typography>
        </Box>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card 
            sx={{ 
              p: 3,
              mb: 3,
              height: 'auto',
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
              '& .MuiDateCalendar-root': {
                width: '100%',
                maxHeight: 'none',
                minHeight: '300px'
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                Calendario de Entregas
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenModal(true)}
                sx={{
                  bgcolor: theme.palette.primary.main,
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  }
                }}
              >
                Nueva Programación
              </Button>
            </Box>
            
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                value={selectedDate}
                onChange={setSelectedDate}
                slots={{
                  day: (props) => {
                    const hasDelivery = hasDeliveries(props.day);
                    return (
                      <Box
                        onClick={(event) => handleDayClick(props.day, event)}
                        sx={{
                          position: 'relative',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          cursor: hasDelivery ? 'pointer' : 'default'
                        }}
                      >
                        <Tooltip 
                          title={hasDelivery ? `${getEntregasCount(props.day)} entregas programadas` : ''}
                          arrow
                        >
                          <Box
                            sx={{
                              color: 'text.primary',
                              backgroundColor: props.selected ? 'primary.main' : 'transparent',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              '&:hover': {
                                backgroundColor: props.selected ? 'primary.dark' : 'action.hover'
                              }
                            }}
                          >
                            {props.day.format('D')}
                          </Box>
                        </Tooltip>
                        {hasDelivery && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: -2,
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              backgroundColor: 'primary.main'
                            }}
                          />
                        )}
                      </Box>
                    );
                  }
                }}
                sx={{
                  width: '100%',
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  '& .MuiDateCalendar-root': {
                    width: '100%',
                    maxHeight: 'none',
                    minHeight: '300px'
                  },
                  '& .MuiDayCalendar-header': {
                    margin: '8px 0',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center'
                  },
                  '& .MuiDayCalendar-weekContainer': {
                    justifyContent: 'space-around',
                    margin: '4px 0',
                    display: 'flex'
                  },
                  '& .MuiPickersDay-root': {
                    margin: '2px',
                    padding: 0,
                    width: '32px',
                    height: '32px',
                    fontSize: '0.875rem',
                    color: 'text.primary',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  },
                  '& .MuiDayCalendar-weekDayLabel': {
                    color: 'text.secondary',
                    fontWeight: 'bold',
                    width: '32px',
                    height: '32px',
                    margin: '0',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '0.875rem'
                  },
                  '& .MuiPickersCalendarHeader-root': {
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  },
                  '& .MuiDayCalendar-slideTransition': {
                    minHeight: '240px'
                  },
                  '& .MuiPickersCalendarHeader-label': {
                    color: 'text.primary',
                    fontWeight: 'bold'
                  },
                  '& .MuiPickersArrowSwitcher-root': {
                    width: 'auto'
                  },
                  '& .MuiPickersCalendarHeader-switchViewButton': {
                    color: 'text.primary'
                  },
                  '& .MuiPickersArrowSwitcher-button': {
                    color: 'text.primary'
                  },
                  '& .Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    }
                  },
                  '& .MuiPickersDay-today': {
                    border: '1px solid',
                    borderColor: 'primary.main',
                    color: 'primary.main'
                  }
                }}
              />
            </LocalizationProvider>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
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
                backgroundColor: theme.palette.success.main,
                borderRadius: '4px 0 0 4px'
              },
              border: 1,
              borderColor: 'divider'
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <CalendarIcon sx={{ color: theme.palette.success.main }} />
              <Typography variant="h6" component="h2">
                Entregas del día
              </Typography>
            </Stack>
            
            <Divider sx={{ mb: 2 }} />
            
            <Typography 
              variant="subtitle1" 
              color="text.secondary" 
              gutterBottom
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2
              }}
            >
              <TimeIcon fontSize="small" />
              {selectedDate.format('DD [de] MMMM [de] YYYY')}
            </Typography>
            
            {getEntregasForDate(selectedDate).length === 0 ? (
              <Alert 
                severity="info" 
                sx={{ 
                  mt: 2,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InventoryIcon />
                No hay entregas programadas para este día
                </Box>
              </Alert>
            ) : (
              getEntregasForDate(selectedDate).map((entrega) => (
                <Card 
                  key={entrega.id} 
                  sx={{ 
                    mt: 2,
                    position: 'relative',
                    '&:hover': {
                      boxShadow: 3
                    },
                    transition: 'box-shadow 0.3s ease-in-out'
                  }}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DeliveryIcon color="primary" />
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                          {entrega.producto}
                        </Typography>
                      </Box>
                      
                      <Divider />
                      
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <InventoryIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                            Cantidad: {entrega.cantidad} unidades
                    </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Destinatario: {entrega.destinatario}
                    </Typography>
                        </Box>
                      </Stack>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        {entrega.descripcion && (
                          <Tooltip title="Ver comentario">
                            <IconButton
                              size="small"
                              onClick={(e) => handleCommentClick(e, entrega.descripcion)}
                              color="primary"
                            >
                              <CommentIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Chip 
                          label={entrega.frecuencia}
                          size="small"
                          color={getChipColorByFrecuencia(entrega.frecuencia)}
                          variant="outlined"
                        />

                      <IconButton
                        size="small"
                        onClick={() => handleDelete(entrega.id)}
                        color="error"
                          sx={{
                            '&:hover': {
                              backgroundColor: 'error.light',
                              color: 'error.contrastText'
                            }
                          }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Card>

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
                backgroundColor: theme.palette.warning.main,
                borderRadius: '4px 0 0 4px'
              },
              border: 1,
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ mr: 1, color: theme.palette.warning.main }} />
                Reporte Semanal
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton 
                  size="small" 
                  onClick={() => navigateWeek('prev')}
                  sx={{ 
                    color: theme.palette.warning.main,
                    '&:hover': {
                      bgcolor: theme.palette.warning.main + '1A'
                    }
                  }}
                >
                  <NavigateBefore />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => navigateWeek('next')}
                  sx={{ 
                    color: theme.palette.warning.main,
                    '&:hover': {
                      bgcolor: theme.palette.warning.main + '1A'
                    }
                  }}
                >
                  <NavigateNext />
                </IconButton>
              </Box>
            </Box>
            
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {weekStart.format('DD MMM')} - {weekStart.endOf('week').format('DD MMM')}
            </Typography>

            {getWeekDeliveries().length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No hay entregas esta semana
              </Alert>
            ) : (
              <Box sx={{ mt: 2 }}>
                {getWeekDeliveries().map((entrega) => {
                  const entregaDate = dayjs(entrega.fecha_entrega);
                  return (
                    <Card 
                      key={entrega.id} 
                      sx={{ 
                        mb: 2,
                        borderLeft: 4,
                        borderColor: 'primary.main'
                      }}
                    >
                      <CardContent>
                        <Typography variant="subtitle2" color="primary">
                          {entregaDate.format('dddd, DD MMM')}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {entrega.producto} ({entrega.cantidad})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Para: {entrega.destinatario}
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      <Dialog 
        open={openModal} 
        onClose={() => !loadingSave && setOpenModal(false)}
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
          alignItems: 'center',
          gap: 1
        }}>
          <ScheduleIcon sx={{ color: theme.palette.primary.main }} />
          Programar Nueva Entrega
        </DialogTitle>
        <DialogContent dividers>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Fecha de entrega"
              value={formData.fecha_entrega}
              onChange={(newValue) => setFormData({ ...formData, fecha_entrega: newValue })}
              sx={{ width: '100%', mb: 2 }}
              format="DD/MM/YYYY"
            />
          </LocalizationProvider>

          <FormControl fullWidth error={!!formErrors.producto} sx={{ mb: 2 }}>
            <InputLabel>Producto</InputLabel>
            <Select
              value={formData.producto}
              onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
            >
              {inventario.map((item) => (
                <MenuItem key={item.id} value={item.nombre}>
                  {item.nombre} (Stock: {item.cantidad})
                </MenuItem>
              ))}
            </Select>
            {formErrors.producto && (
              <Typography variant="caption" color="error">
                {formErrors.producto}
              </Typography>
            )}
          </FormControl>

          <TextField
            fullWidth
            label="Cantidad"
            type="number"
            value={formData.cantidad}
            onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
            error={!!formErrors.cantidad}
            helperText={formErrors.cantidad}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Destinatario"
            value={formData.destinatario}
            onChange={(e) => setFormData({ ...formData, destinatario: e.target.value })}
            error={!!formErrors.destinatario}
            helperText={formErrors.destinatario}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Frecuencia</InputLabel>
            <Select
              value={formData.frecuencia}
              onChange={(e) => setFormData({ ...formData, frecuencia: e.target.value })}
            >
              <MenuItem value="mensual">Mensual</MenuItem>
              <MenuItem value="quincenal">Quincenal</MenuItem>
              <MenuItem value="semanal">Semanal</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Descripción (opcional)"
            multiline
            rows={3}
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenModal(false)} 
            disabled={loadingSave}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loadingSave}
            startIcon={loadingSave ? <CircularProgress size={20} /> : <EventIcon />}
          >
            {loadingSave ? 'Guardando...' : 'Programar Entrega'}
          </Button>
        </DialogActions>
      </Dialog>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            width: '300px',
            p: 2,
            bgcolor: 'background.paper',
          }
        }}
      >
        {popoverDate && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
              Entregas del {popoverDate.format('DD [de] MMMM')}
            </Typography>
            <List dense>
              {getEntregasForDate(popoverDate).map((entrega) => (
                <ListItem 
                  key={entrega.id}
                  sx={{
                    borderLeft: 2,
                    borderColor: 'primary.main',
                    pl: 2,
                    mb: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1
                  }}
                >
                  <ListItemIcon>
                    <DeliveryIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={entrega.producto}
                    secondary={`${entrega.cantidad} unidades - Para: ${entrega.destinatario}`}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Popover>

      <Popover
        open={commentOpen}
        anchorEl={commentAnchorEl}
        onClose={handleCommentClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            maxWidth: '300px',
            p: 2,
            bgcolor: 'background.paper',
          }
        }}
      >
        <Typography variant="subtitle2" color="primary" gutterBottom>
          Comentario de la entrega
        </Typography>
        <Typography variant="body2">
          {selectedComment}
        </Typography>
      </Popover>

      <SpeedDial
        ariaLabel="Acciones rápidas"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<FilterIcon />}
          tooltipTitle="Filtrar entregas"
          onClick={(e) => setFilterAnchorEl(e.currentTarget)}
        />
        <SpeedDialAction
          icon={<ExportIcon />}
          tooltipTitle="Exportar cronograma"
          onClick={handleExportCronograma}
        />
      </SpeedDial>

      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filtrar por frecuencia
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <Select
              value={filters.frecuencia}
              onChange={(e) => setFilters({ ...filters, frecuencia: e.target.value })}
            >
              <MenuItem value="todas">Todas</MenuItem>
              <MenuItem value="semanal">Semanal</MenuItem>
              <MenuItem value="quincenal">Quincenal</MenuItem>
              <MenuItem value="mensual">Mensual</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle2" gutterBottom>
            Filtrar por destinatario
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={filters.destinatario}
              onChange={(e) => setFilters({ ...filters, destinatario: e.target.value })}
            >
              <MenuItem value="todos">Todos</MenuItem>
              {[...new Set(cronogramas.map(c => c.destinatario))].map(dest => (
                <MenuItem key={dest} value={dest}>{dest}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Menu>
    </Container>
  );
};

export default Cronograma;
