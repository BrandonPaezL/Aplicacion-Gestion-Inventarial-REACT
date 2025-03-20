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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Box,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  InputAdornment,
  useTheme,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalShipping as LocalShippingIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useSnackbar } from "notistack";
import dayjs from "dayjs";

const EntregaProductos = () => {
  const theme = useTheme();
  const [entregas, setEntregas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentEntrega, setCurrentEntrega] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    producto: "",
    cantidad: "",
    destinatario: "",
  });

  useEffect(() => {
    fetchEntregas();
    fetchInventario();
  }, []);

  const fetchEntregas = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/entregas");
      if (response.data) {
        setEntregas(response.data);
      }
    } catch (error) {
      console.error("Error en fetchEntregas:", error);
      enqueueSnackbar("Error al obtener entregas", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchInventario = async () => {
    try {
      const response = await axios.get("http://localhost:5000/productos");
      setInventario(response.data);
    } catch (error) {
      enqueueSnackbar("Error al obtener inventario", { variant: "error" });
    }
  };

  const handleOpenModal = (entrega = null) => {
    if (entrega) {
      const productoExiste = inventario.find(item => item.nombre === entrega.producto);
      if (!productoExiste) {
        enqueueSnackbar("El producto ya no existe en el inventario", { variant: "warning" });
        return;
      }

      setFormData({
        producto: entrega.producto,
        cantidad: entrega.cantidad.toString(),
        destinatario: entrega.destinatario,
      });
      setEditMode(true);
      setCurrentEntrega(entrega);
    } else {
      setFormData({ producto: "", cantidad: "", destinatario: "" });
      setEditMode(false);
      setCurrentEntrega(null);
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    console.log('FormData inicial:', formData);
    
    // Validaciones iniciales
    if (!formData.producto || !formData.cantidad || !formData.destinatario) {
      enqueueSnackbar("Todos los campos son requeridos", { variant: "warning" });
      console.log('Datos del formulario incompletos:', {
        producto: Boolean(formData.producto),
        cantidad: Boolean(formData.cantidad),
        destinatario: Boolean(formData.destinatario),
        valoresActuales: formData
      });
      return;
    }

    const cantidadNumerica = parseInt(formData.cantidad);
    console.log('Cantidad convertida:', cantidadNumerica);
    
    if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) {
      enqueueSnackbar("La cantidad debe ser un número positivo", { variant: "warning" });
      return;
    }

    setLoadingSave(true);

    try {
      // Asegurarse de que los campos no estén vacíos después del trim
      const productoLimpio = String(formData.producto || "").trim();
      const destinatarioLimpio = String(formData.destinatario || "").trim();

      if (!productoLimpio || !destinatarioLimpio) {
        enqueueSnackbar("Los campos no pueden estar vacíos", { variant: "warning" });
        return;
      }

      // Verificar stock disponible
      const productoSeleccionado = inventario.find(item => item.nombre === productoLimpio);
      if (!productoSeleccionado) {
        enqueueSnackbar("Producto no encontrado en inventario", { variant: "error" });
        return;
      }

      if (productoSeleccionado.cantidad < cantidadNumerica) {
        enqueueSnackbar(`Stock insuficiente. Stock actual: ${productoSeleccionado.cantidad}`, { variant: "error" });
        return;
      }

      const datosAEnviar = {
        producto: productoLimpio,
        cantidad: cantidadNumerica,
        destinatario: destinatarioLimpio
      };

      console.log('Datos a enviar:', datosAEnviar);

      const userInfo = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'X-User-Name': userInfo?.user?.name || 'Sistema',
        'X-User-Id': userInfo?.user?.id || '0'
      };

      try {
        // Primero actualizamos el stock
        const nuevaCantidad = productoSeleccionado.cantidad - cantidadNumerica;
        console.log('Nueva cantidad calculada:', nuevaCantidad);

        if (nuevaCantidad < 0) {
          enqueueSnackbar("La cantidad a entregar no puede ser mayor al stock disponible", { variant: "error" });
          return;
        }

        const datosActualizacion = {
          nombre: productoSeleccionado.nombre,
          cantidad: nuevaCantidad,
          fecha_vencimiento: productoSeleccionado.fecha_vencimiento ? 
            dayjs(productoSeleccionado.fecha_vencimiento).format('YYYY-MM-DD') : 
            dayjs().add(1, 'year').format('YYYY-MM-DD'), // Fecha por defecto: 1 año desde hoy
          categoria: productoSeleccionado.categoria || 'SIN CATEGORÍA',
          proveedor: productoSeleccionado.proveedor || 'SIN PROVEEDOR',
          ubicacion: productoSeleccionado.ubicacion || 'bodega_principal'
        };

        console.log('Datos de actualización a enviar:', datosActualizacion);
        console.log('Headers:', headers);
        
        if (editMode) {
          // Si estamos editando una entrega existente
          const response = await axios.put(`http://localhost:5000/entregas/${currentEntrega.id}`, datosAEnviar, { headers });

          // Registrar en auditoría la modificación
          await axios.post('http://localhost:5000/auditorias', {
            usuario_id: userInfo.user.id,
            usuario_nombre: userInfo.user.name,
            accion: 'modificación',
            detalles: {
              tipo: 'entrega',
              producto: datosAEnviar.producto,
              cantidad: datosAEnviar.cantidad,
              cantidad_anterior: currentEntrega.cantidad,
              destinatario: datosAEnviar.destinatario,
              destinatario_anterior: currentEntrega.destinatario,
              fecha: dayjs().format('YYYY-MM-DD')
            }
          }, { headers });

          // Actualizar el stock del producto
          await axios.put(`http://localhost:5000/productos/${productoSeleccionado.id}`, datosActualizacion, { headers });

          if (response.status === 200) {
            enqueueSnackbar('Entrega actualizada correctamente ✅', { variant: 'success' });
            setOpenModal(false);
            setFormData({ producto: '', cantidad: '', destinatario: '' });
            await Promise.all([fetchEntregas(), fetchInventario()]);
          }
        } else {
          // Si estamos creando una nueva entrega
          const response = await axios.post("http://localhost:5000/entregas", datosAEnviar, {
            headers: headers
          });

          // Actualizar el stock del producto
          await axios.put(`http://localhost:5000/productos/${productoSeleccionado.id}`, datosActualizacion, { headers });

          console.log('Entrega registrada:', response.data);
          enqueueSnackbar("Entrega registrada correctamente 🎉", { variant: "success" });
          
          setOpenModal(false);
          setFormData({ producto: "", cantidad: "", destinatario: "" });
          await Promise.all([fetchEntregas(), fetchInventario()]); // Actualizar ambas listas
        }
      } catch (error) {
        console.error('Error detallado:', error);
        console.error('Respuesta del servidor:', error.response?.data);
        console.error('Estado de la respuesta:', error.response?.status);
        console.error('Headers de la respuesta:', error.response?.headers);

        let mensajeError = 'Error al procesar la operación';
        if (error.response?.data?.detalles) {
          mensajeError = error.response.data.detalles;
        } else if (error.response?.data?.error) {
          mensajeError = error.response.data.error;
        } else if (error.message) {
          mensajeError = error.message;
        }

        enqueueSnackbar(`Error: ${mensajeError}`, { 
          variant: "error",
          autoHideDuration: 8000
        });
      }
    } catch (error) {
      console.error('Error general:', error);
      console.error('Stack:', error.stack);
      enqueueSnackbar("Error inesperado al procesar la operación", { 
        variant: "error",
        autoHideDuration: 8000 
      });
    } finally {
      setLoadingSave(false);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditMode(false);
    setCurrentEntrega(null);
    setFormData({ producto: "", cantidad: "", destinatario: "" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta entrega?')) {
      return;
    }

    try {
      const entregaAEliminar = entregas.find(e => e.id === id);
      const userInfo = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');

      if (!userInfo || !userInfo.user) {
        enqueueSnackbar("Error: No hay usuario autenticado", { variant: "error" });
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'X-User-Name': userInfo.user.name,
        'X-User-Id': userInfo.user.id
      };

      // Primero registramos la auditoría
      await axios.post('http://localhost:5000/auditorias', {
        usuario_id: userInfo.user.id,
        usuario_nombre: userInfo.user.name,
        accion: 'eliminación',
        detalles: {
          tipo: 'entrega',
          nombre: `Entrega #${id}`,
          producto: entregaAEliminar.producto,
          cantidad: entregaAEliminar.cantidad,
          destinatario: entregaAEliminar.destinatario
        }
      }, { headers });

      // Luego eliminamos la entrega
      const response = await axios.delete(`http://localhost:5000/entregas/${id}`, { headers });

      if (response.data.message) {
        const productoSeleccionado = inventario.find(item => item.nombre === entregaAEliminar.producto);
        if (productoSeleccionado) {
          await axios.put(`http://localhost:5000/productos/${productoSeleccionado.id}`, {
            nombre: productoSeleccionado.nombre,
            cantidad: productoSeleccionado.cantidad + parseInt(entregaAEliminar.cantidad),
            fecha_vencimiento: productoSeleccionado.fecha_vencimiento,
            categoria: productoSeleccionado.categoria,
            proveedor: productoSeleccionado.proveedor,
            ubicacion: productoSeleccionado.ubicacion
          }, { headers });
        }

        enqueueSnackbar("Entrega eliminada correctamente ✅", { variant: "success" });
        await Promise.all([fetchEntregas(), fetchInventario()]);
      }
    } catch (error) {
      console.error("Error detallado:", error.response || error);
      enqueueSnackbar(
        `Error al eliminar la entrega: ${error.response?.data?.error || error.message} ❌`, 
        { variant: "error" }
      );
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
            <LocalShippingIcon sx={{ fontSize: 24, mr: 1, color: theme.palette.primary.main }} />
            Entrega de Productos
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="Buscar entrega..."
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
              onClick={() => handleOpenModal()}
              startIcon={<AddIcon />}
              sx={{
                minWidth: '180px',
                bgcolor: theme.palette.primary.main,
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                }
              }}
            >
              Nueva Entrega
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
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
                    <TableCell>Producto</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Destinatario</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entregas
                    .filter(entrega =>
                      entrega.producto.toLowerCase().includes(search.toLowerCase()) ||
                      entrega.destinatario.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((entrega) => (
                      <TableRow 
                        key={entrega.id}
                        sx={{
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                          }
                        }}
                      >
                        <TableCell>{entrega.id}</TableCell>
                        <TableCell>{entrega.producto}</TableCell>
                        <TableCell>{entrega.cantidad}</TableCell>
                        <TableCell>{entrega.destinatario}</TableCell>
                        <TableCell>
                          {new Date(entrega.fecha).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            color="primary" 
                            onClick={() => handleOpenModal(entrega)}
                            sx={{ 
                              '&:hover': { 
                                bgcolor: theme.palette.primary.main + '1A'
                              }
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            color="error"
                            onClick={() => handleDelete(entrega.id)}
                            sx={{ 
                              '&:hover': { 
                                bgcolor: theme.palette.error.main + '1A'
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog 
        open={openModal} 
        onClose={handleCloseModal}
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
          <LocalShippingIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          {editMode ? "Editar Entrega" : "Nueva Entrega"}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Producto</InputLabel>
              <Select
                value={formData.producto}
                onChange={(e) =>
                  setFormData({ ...formData, producto: e.target.value })
                }
                label="Producto"
              >
                {inventario.map((item) => (
                  <MenuItem key={item.id} value={item.nombre}>
                    {item.nombre} - Stock: {item.cantidad}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Cantidad"
              type="number"
              fullWidth
              value={formData.cantidad}
              onChange={(e) =>
                setFormData({ ...formData, cantidad: e.target.value })
              }
            />

            <TextField
              label="Destinatario"
              fullWidth
              value={formData.destinatario}
              onChange={(e) =>
                setFormData({ ...formData, destinatario: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={handleCloseModal}
            disabled={loadingSave}
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
            variant="contained"
            onClick={handleSave}
            disabled={loadingSave}
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              }
            }}
          >
            {loadingSave ? (
              <CircularProgress size={24} color="inherit" />
            ) : editMode ? (
              "Actualizar"
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EntregaProductos;
