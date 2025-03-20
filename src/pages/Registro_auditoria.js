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
  InputAdornment,
  Card,
  Box,
  Chip,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Stack,
  Divider,
  CircularProgress,
  TablePagination,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Info as InfoIcon,
  GetApp as DownloadIcon,
} from "@mui/icons-material";
import { useTheme } from '@mui/material/styles';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { auditoriaService } from '../services/auditoria';

dayjs.locale('es');

const formatearDetalles = (detalles) => {
  if (typeof detalles === 'string') {
    try {
      const objetoDetalles = JSON.parse(detalles);
      return Object.entries(objetoDetalles).map(([clave, valor]) => (
        <Box key={clave} sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            {clave}:
          </Typography>
          <Typography variant="body2" component="span">
            {typeof valor === 'object' ? JSON.stringify(valor) : valor}
          </Typography>
        </Box>
      ));
    } catch {
      return detalles;
    }
  }
  
  if (typeof detalles === 'object') {
    return Object.entries(detalles).map(([clave, valor]) => (
      <Box key={clave} sx={{ mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
          {clave}:
        </Typography>
        <Typography variant="body2" component="span">
          {typeof valor === 'object' ? JSON.stringify(valor) : valor}
        </Typography>
      </Box>
    ));
  }

  return detalles;
};

const formatearDescripcion = (auditoria) => {
  if (!auditoria.detalles) return '';
  
  try {
    const detalles = typeof auditoria.detalles === 'string' 
      ? JSON.parse(auditoria.detalles) 
      : auditoria.detalles;

    switch (auditoria.accion?.toLowerCase()) {
      case 'creación':
        if (detalles.tipo === 'cronograma') {
          return `Programó una entrega de ${detalles.cantidad} ${detalles.producto} para ${detalles.destinatario} el día ${dayjs(detalles.fecha_entrega).format('DD/MM/YYYY')} (${detalles.frecuencia})`;
        }
        if (detalles.tipo === 'producto') {
          let detallesProducto = [];
          if (detalles.cantidad) detallesProducto.push(`con ${detalles.cantidad} unidades`);
          if (detalles.categoria) detallesProducto.push(`en la categoría ${detalles.categoria}`);
          if (detalles.ubicacion) detallesProducto.push(`ubicado en ${detalles.ubicacion.split('_').map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1)).join(' ')}`);
          if (detalles.proveedor) detallesProducto.push(`proveído por ${detalles.proveedor}`);
          if (detalles.fecha_vencimiento) {
            detallesProducto.push(`con fecha de vencimiento el ${dayjs(detalles.fecha_vencimiento).format('DD/MM/YYYY')}`);
          }
          return `Agregó el producto "${detalles.nombre}" ${detallesProducto.join(', ')}`;
        }
        return `Agregó ${detalles.nombre || 'un nuevo registro'}`;
      case 'modificación':
        if (detalles.tipo === 'cronograma') {
          return `Actualizó la programación de entrega #${detalles.nombre} (${detalles.producto} - ${detalles.destinatario})`;
        }
        if (detalles.mensaje && detalles.cambios) {
          const cambiosAnteriores = detalles.cambios.anterior || {};
          const cambiosNuevos = detalles.cambios.nuevo || {};
          let cambios = [];
          
          if (cambiosAnteriores.cantidad !== cambiosNuevos.cantidad) {
            cambios.push(`cantidad de ${cambiosAnteriores.cantidad} a ${cambiosNuevos.cantidad}`);
          }
          if (cambiosAnteriores.ubicacion !== cambiosNuevos.ubicacion) {
            cambios.push(`ubicación de ${cambiosAnteriores.ubicacion || 'sin ubicación'} a ${cambiosNuevos.ubicacion}`);
          }
          if (cambiosAnteriores.categoria !== cambiosNuevos.categoria) {
            cambios.push(`categoría de ${cambiosAnteriores.categoria || 'sin categoría'} a ${cambiosNuevos.categoria}`);
          }
          if (cambiosAnteriores.proveedor !== cambiosNuevos.proveedor) {
            cambios.push(`proveedor de ${cambiosAnteriores.proveedor || 'sin proveedor'} a ${cambiosNuevos.proveedor}`);
          }
          if (cambiosAnteriores.fecha_vencimiento !== cambiosNuevos.fecha_vencimiento) {
            const fechaAnterior = cambiosAnteriores.fecha_vencimiento ? dayjs(cambiosAnteriores.fecha_vencimiento).format('DD/MM/YYYY') : 'sin fecha';
            const fechaNueva = cambiosNuevos.fecha_vencimiento ? dayjs(cambiosNuevos.fecha_vencimiento).format('DD/MM/YYYY') : 'sin fecha';
            cambios.push(`fecha de vencimiento de ${fechaAnterior} a ${fechaNueva}`);
          }
          
          if (cambios.length > 0) {
            return `Actualizó el producto ${cambiosNuevos.nombre}: ${cambios.join(', ')}`;
          }
          return `Actualizó el producto ${cambiosNuevos.nombre}`;
        }
        if (detalles.tipo === 'entrega') {
          let cambios = [];
          if (detalles.cantidad_anterior !== undefined) {
            cambios.push(`cantidad de ${detalles.cantidad_anterior} a ${detalles.cantidad}`);
          }
          if (detalles.destinatario_anterior !== detalles.destinatario) {
            cambios.push(`destinatario a ${detalles.destinatario}`);
          }
          if (cambios.length > 0) {
            return `Actualizó la entrega de ${detalles.producto}: ${cambios.join(', ')}`;
          }
          return `Actualizó la entrega de ${detalles.producto}`;
        }
        return '';
      case 'eliminación':
        if (detalles.tipo === 'cronograma') {
          return `Eliminó la programación de entrega de ${detalles.cantidad} ${detalles.producto} para ${detalles.destinatario} (${detalles.frecuencia})`;
        }
        if (detalles.tipo === 'entrega') {
          return `Eliminó la entrega de ${detalles.cantidad} ${detalles.producto} a ${detalles.destinatario}`;
        }
        return `Eliminó ${detalles.nombre || 'un registro'}`;
      case 'entrega':
        return `Entregó ${detalles.cantidad || ''} ${detalles.producto || 'productos'} a ${detalles.destinatario || ''}`;
      case 'descarga':
        return `Descargó ${detalles.tipo || 'un reporte'}`;
      case 'login':
        return `Inició sesión`;
      case 'logout':
        return `Cerró sesión`;
      default:
        return detalles.descripcion || '';
    }
  } catch {
    return '';
  }
};

const RegistroAuditoria = () => {
  const theme = useTheme();
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtros, setFiltros] = useState({
    tipo: "todos",
    usuario: "todos",
    fecha: "todos"
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchAuditorias();
  }, []);

  const fetchAuditorias = async () => {
    setLoading(true);
    try {
      const data = await auditoriaService.obtenerRegistros();
      setAuditorias(data);
    } catch (error) {
      console.error("Error al obtener auditorías:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTipoChipColor = (tipo) => {
    if (!tipo) return 'default';
    
    switch (tipo.toLowerCase()) {
      case 'login':
        return 'success';
      case 'logout':
        return 'error';
      case 'creación':
        return 'success';
      case 'modificación':
        return 'warning';
      case 'eliminación':
        return 'error';
      case 'entrega':
        return 'info';
      case 'descarga':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'login':
        return '🔑';
      case 'logout':
        return '🚪';
      case 'creación':
        return '✨';
      case 'modificación':
        return '📝';
      case 'eliminación':
        return '🗑️';
      case 'entrega':
        return '📦';
      case 'descarga':
        return '⬇️';
      default:
        return '📋';
    }
  };

  const filteredAuditorias = auditorias
    .filter((auditoria) => {
      const searchLower = search.toLowerCase();
      const matchSearch = 
        (auditoria.usuario_nombre || '').toLowerCase().includes(searchLower) ||
        (auditoria.accion || '').toLowerCase().includes(searchLower);

      const matchTipo = filtros.tipo === "todos" || auditoria.accion === filtros.tipo;
      const matchUsuario = filtros.usuario === "todos" || auditoria.usuario_nombre === filtros.usuario;
      
      let matchFecha = true;
      if (filtros.fecha === "hoy") {
        matchFecha = dayjs(auditoria.fecha_hora).isSame(dayjs(), 'day');
      } else if (filtros.fecha === "semana") {
        matchFecha = dayjs(auditoria.fecha_hora).isAfter(dayjs().subtract(7, 'day'));
      } else if (filtros.fecha === "mes") {
        matchFecha = dayjs(auditoria.fecha_hora).isAfter(dayjs().subtract(1, 'month'));
      }

      return matchSearch && matchTipo && matchUsuario && matchFecha;
    })
    .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));

  const handleExportAuditoria = () => {
    try {
      const dataToExport = filteredAuditorias.map(auditoria => ({
        'Usuario': auditoria.usuario_nombre,
        'Acción': auditoria.accion,
        'Fecha y Hora': dayjs(auditoria.fecha_hora).format('DD/MM/YYYY HH:mm:ss'),
        'Descripción': formatearDescripcion(auditoria)
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      ws['!cols'] = [
        { wch: 20 }, // Usuario
        { wch: 15 }, // Acción
        { wch: 20 }, // Fecha y Hora
        { wch: 50 }  // Descripción
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Registro de Auditoría');
      XLSX.writeFile(wb, `registro_auditoria_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    } catch (error) {
      console.error('Error al exportar:', error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
          <HistoryIcon sx={{ fontSize: 30, color: theme.palette.primary.main, mr: 2 }} />
          <Typography variant="h4" component="h1">
            Registro de Auditoría
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Buscar en registros..."
              variant="outlined"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filtros.tipo}
                label="Tipo"
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="login">Login</MenuItem>
                <MenuItem value="logout">Logout</MenuItem>
                <MenuItem value="creación">Creación</MenuItem>
                <MenuItem value="modificación">Modificación</MenuItem>
                <MenuItem value="eliminación">Eliminación</MenuItem>
                <MenuItem value="entrega">Entrega</MenuItem>
                <MenuItem value="descarga">Descarga</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Usuario</InputLabel>
              <Select
                value={filtros.usuario}
                label="Usuario"
                onChange={(e) => setFiltros({ ...filtros, usuario: e.target.value })}
              >
                <MenuItem value="todos">Todos</MenuItem>
                {[...new Set(auditorias.map(a => a.usuario_nombre))].map(usuario => (
                  <MenuItem key={usuario} value={usuario}>{usuario}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Fecha</InputLabel>
              <Select
                value={filtros.fecha}
                label="Fecha"
                onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
              >
                <MenuItem value="todos">Todas</MenuItem>
                <MenuItem value="hoy">Hoy</MenuItem>
                <MenuItem value="semana">Última semana</MenuItem>
                <MenuItem value="mes">Último mes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 2 }}>
          <Tooltip title="Exportar registros">
            <IconButton onClick={handleExportAuditoria} color="primary">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="15%">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">Usuario</Typography>
                  </Stack>
                </TableCell>
                <TableCell width="15%">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <FilterIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">Acción</Typography>
                  </Stack>
                </TableCell>
                <TableCell width="20%">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <EventIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">Fecha y Hora</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <InfoIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">Descripción</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAuditorias
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((auditoria) => (
                <TableRow 
                  key={auditoria.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  }}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography variant="body2">{auditoria.usuario_nombre}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={auditoria.accion}
                      color={getTipoChipColor(auditoria.accion)}
                      size="small"
                      sx={{
                        '& .MuiChip-label': {
                          px: 2,
                          fontSize: '0.875rem',
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {dayjs(auditoria.fecha_hora).format('DD/MM/YYYY HH:mm:ss')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {formatearDescripcion(auditoria)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredAuditorias.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count}`
          }
        />
      </Card>
    </Container>
  );
};

export default RegistroAuditoria;
