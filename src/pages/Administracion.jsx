import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tab,
  Tabs,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warehouse as WarehouseIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import axios from 'axios';

const Administracion = () => {
  const [unidades, setUnidades] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [openUnidad, setOpenUnidad] = useState(false);
  const [openBodega, setOpenBodega] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    unidad_id: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [unidadesRes, bodegasRes] = await Promise.all([
        axios.get('/api/unidades'),
        axios.get('/api/bodegas')
      ]);
      setUnidades(unidadesRes.data);
      setBodegas(bodegasRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      mostrarSnackbar('Error al cargar los datos', 'error');
    }
  };

  const handleOpenUnidad = () => {
    setFormData({ nombre: '', descripcion: '' });
    setOpenUnidad(true);
  };

  const handleOpenBodega = () => {
    setFormData({ nombre: '', descripcion: '', unidad_id: '' });
    setOpenBodega(true);
  };

  const handleClose = () => {
    setOpenUnidad(false);
    setOpenBodega(false);
  };

  const handleSubmit = async (tipo) => {
    try {
      if (tipo === 'unidad') {
        await axios.post('/api/unidades', formData);
        mostrarSnackbar('Unidad creada exitosamente', 'success');
      } else {
        await axios.post('/api/bodegas', formData);
        mostrarSnackbar('Bodega creada exitosamente', 'success');
      }
      handleClose();
      cargarDatos();
    } catch (error) {
      console.error('Error al crear:', error);
      mostrarSnackbar('Error al crear el registro', 'error');
    }
  };

  const mostrarSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Administración del Sistema
        </Typography>

        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab icon={<BusinessIcon />} label="Unidades" />
          <Tab icon={<WarehouseIcon />} label="Bodegas" />
        </Tabs>

        {selectedTab === 0 && (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Unidades</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenUnidad}
              >
                Nueva Unidad
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Fecha Creación</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unidades.map((unidad) => (
                    <TableRow key={unidad.id}>
                      <TableCell>{unidad.nombre}</TableCell>
                      <TableCell>{unidad.descripcion}</TableCell>
                      <TableCell>{new Date(unidad.fecha_creacion).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <IconButton color="primary">
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {selectedTab === 1 && (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Bodegas</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenBodega}
              >
                Nueva Bodega
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Unidad</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Fecha Creación</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bodegas.map((bodega) => (
                    <TableRow key={bodega.id}>
                      <TableCell>{bodega.nombre}</TableCell>
                      <TableCell>
                        {unidades.find(u => u.id === bodega.unidad_id)?.nombre}
                      </TableCell>
                      <TableCell>{bodega.descripcion}</TableCell>
                      <TableCell>{new Date(bodega.fecha_creacion).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <IconButton color="primary">
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>

      {/* Diálogo para crear/editar unidad */}
      <Dialog open={openUnidad} onClose={handleClose}>
        <DialogTitle>Nueva Unidad</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre"
            fullWidth
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Descripción"
            fullWidth
            multiline
            rows={4}
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={() => handleSubmit('unidad')} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para crear/editar bodega */}
      <Dialog open={openBodega} onClose={handleClose}>
        <DialogTitle>Nueva Bodega</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre"
            fullWidth
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          />
          <TextField
            select
            margin="dense"
            label="Unidad"
            fullWidth
            value={formData.unidad_id}
            onChange={(e) => setFormData({ ...formData, unidad_id: e.target.value })}
          >
            {unidades.map((unidad) => (
              <option key={unidad.id} value={unidad.id}>
                {unidad.nombre}
              </option>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="Descripción"
            fullWidth
            multiline
            rows={4}
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={() => handleSubmit('bodega')} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Administracion; 