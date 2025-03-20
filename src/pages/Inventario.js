import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  Grid,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import InventoryIcon from "@mui/icons-material/Inventory";
import { useSnackbar } from "notistack";

const formatDate = (isoString) => {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return isoString || "-";
  }
};

const formatUbicacion = (ubicacion) => {
  if (!ubicacion) return "-";
  return ubicacion
    .split('_')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
};

const Inventario = () => {
  const [products, setProducts] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [tieneCaducidad, setTieneCaducidad] = useState(false);
  const [search, setSearch] = useState("");
  const theme = useTheme();
  const [formData, setFormData] = useState({
    id: "Auto-generado",
    nombre: "",
    cantidad: "",
    fecha_ingreso: formatDate(new Date()),
    fecha_vencimiento: "",
    categoria: "",
    proveedor: "",
    ubicacion: "bodega_principal",
  });
  const { enqueueSnackbar } = useSnackbar();

  const ubicaciones = [
    { value: 'bodega_principal', label: 'Bodega Principal' },
    { value: 'bodega_fria', label: 'Bodega Fría' },
    { value: 'farmacia', label: 'Farmacia' },
    { value: 'consultorio', label: 'Consultorio' },
    { value: 'emergencia', label: 'Sala de Emergencia' }
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/productos");
      setProducts(response.data);
    } catch (error) {
      console.error("Error al obtener productos:", error);
    }
  };

  const handleOpenModal = (producto = null) => {
    setEditingProduct(producto);
    setFormData(
      producto || {
        id: "Auto-generado",
        nombre: "",
        cantidad: "",
        fecha_ingreso: formatDate(new Date()),
        fecha_vencimiento: "",
        categoria: "",
        proveedor: "",
        ubicacion: "bodega_principal",
      }
    );
    setTieneCaducidad(producto ? producto.fecha_vencimiento !== "NO" : false);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) {
      return;
    }

    try {
      const productoAEliminar = products.find(p => p.id === id);
      const userInfo = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      
      console.log('Información del usuario:', userInfo); // Debug

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
          nombre: productoAEliminar.nombre,
          cantidad: productoAEliminar.cantidad,
          categoria: productoAEliminar.categoria,
          ubicacion: productoAEliminar.ubicacion
        }
      }, { headers });

      // Luego eliminamos el producto
      await axios.delete(`http://localhost:5000/productos/${id}`, { headers });
      
      enqueueSnackbar("Producto eliminado correctamente ✅", { variant: "success" });
      fetchProducts();
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      enqueueSnackbar(
        `Error al eliminar el producto: ${error.response?.data?.error || error.message} ❌`, 
        { variant: "error" }
      );
    }
  };

  const handleSave = async () => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      
      console.log('Información del usuario en handleSave:', userInfo); // Debug

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

      const productoData = {
        nombre: formData.nombre,
        cantidad: formData.cantidad,
        fecha_vencimiento: tieneCaducidad ? formData.fecha_vencimiento : null,
        categoria: formData.categoria,
        proveedor: formData.proveedor,
        ubicacion: formData.ubicacion,
      };

      let resultado;
      if (editingProduct) {
        // Verificar qué campos han cambiado
        const cambios = {};
        if (productoData.cantidad !== editingProduct.cantidad) {
          cambios.cantidad_anterior = editingProduct.cantidad;
          cambios.cantidad = productoData.cantidad;
        }
        if (productoData.categoria !== editingProduct.categoria) {
          cambios.categoria_anterior = editingProduct.categoria;
          cambios.categoria = productoData.categoria;
        }
        if (productoData.ubicacion !== editingProduct.ubicacion) {
          cambios.ubicacion_anterior = editingProduct.ubicacion;
          cambios.ubicacion = productoData.ubicacion;
        }
        if (productoData.proveedor !== editingProduct.proveedor) {
          cambios.proveedor_anterior = editingProduct.proveedor;
          cambios.proveedor = productoData.proveedor;
        }
        if (productoData.fecha_vencimiento !== editingProduct.fecha_vencimiento) {
          cambios.fecha_vencimiento_anterior = editingProduct.fecha_vencimiento;
          cambios.fecha_vencimiento = productoData.fecha_vencimiento;
        }

        // Solo si hay cambios, actualizamos el producto
        if (Object.keys(cambios).length > 0) {
          // Actualizar producto
          resultado = await axios.put(
            `http://localhost:5000/productos/${editingProduct.id}`,
            productoData,
            { headers }
          );

          enqueueSnackbar("Producto actualizado correctamente ✅", { variant: "success" });
        } else {
          enqueueSnackbar("No se detectaron cambios en el producto", { variant: "info" });
        }
      } else {
        // Crear nuevo producto
        resultado = await axios.post(
          "http://localhost:5000/productos", 
          productoData,
          { headers }
        );

        // Registrar en auditoría la creación
        await axios.post('http://localhost:5000/auditorias', {
          usuario_id: userInfo.user.id,
          usuario_nombre: userInfo.user.name,
          accion: 'creación',
          detalles: {
            tipo: 'producto',
            nombre: productoData.nombre,
            cantidad: productoData.cantidad,
            categoria: productoData.categoria,
            ubicacion: productoData.ubicacion,
            proveedor: productoData.proveedor,
            fecha_vencimiento: productoData.fecha_vencimiento
          }
        }, { headers });

        enqueueSnackbar("Producto creado correctamente ✅", { variant: "success" });
      }

      fetchProducts();
      handleCloseModal();
    } catch (error) {
      console.error("Error guardando producto:", error);
      enqueueSnackbar(
        `Error al ${editingProduct ? 'actualizar' : 'crear'} el producto: ${error.response?.data?.error || error.message} ❌`,
        { variant: "error" }
      );
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
            backgroundColor: theme.palette.primary.main,
            borderRadius: '4px 0 0 4px'
          },
          border: 1,
          borderColor: 'divider'
        }}
      >
        <CardContent>
          <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <InventoryIcon sx={{ fontSize: 24, mr: 1, color: theme.palette.primary.main }} />
            Productos Disponibles
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <TextField
              label="Buscar producto..."
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
              startIcon={<AddIcon />} 
              onClick={() => handleOpenModal()}
              sx={{
                minWidth: '180px',
                bgcolor: theme.palette.primary.main,
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                }
              }}
            >
              Añadir Producto
            </Button>
          </Box>

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
                  <TableCell>Fecha de Ingreso</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Fecha de Caducidad</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Ubicación</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products
                  .filter((producto) =>
                    producto.nombre.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((producto) => (
                    <TableRow 
                      key={producto.id}
                      sx={{
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                        }
                      }}
                    >
                      <TableCell>{producto.id}</TableCell>
                      <TableCell>{producto.nombre}</TableCell>
                      <TableCell>{formatDate(producto.fecha_ingreso)}</TableCell>
                      <TableCell>{producto.cantidad}</TableCell>
                      <TableCell>{formatDate(producto.fecha_vencimiento)}</TableCell>
                      <TableCell>{producto.categoria}</TableCell>
                      <TableCell>{producto.proveedor}</TableCell>
                      <TableCell>{formatUbicacion(producto.ubicacion)}</TableCell>
                      <TableCell align="center">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenModal(producto)}
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
                          onClick={() => handleDelete(producto.id)}
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
        </CardContent>
      </Card>

      <Dialog 
        open={openModal} 
        onClose={handleCloseModal} 
        fullWidth 
        maxWidth="sm"
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
          <AddIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          {editingProduct ? "Editar Producto" : "Añadir Producto"}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Nombre"
                fullWidth
                name="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Cantidad"
                fullWidth
                type="number"
                name="cantidad"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={tieneCaducidad}
                    onChange={() => {
                      setTieneCaducidad(!tieneCaducidad);
                      if (tieneCaducidad) {
                        setFormData({ ...formData, fecha_vencimiento: null });
                      }
                    }}
                  />
                }
                label="¿Tiene fecha de caducidad?"
              />
            </Grid>
            {tieneCaducidad && (
              <Grid item xs={12}>
                <TextField
                  label="Fecha de Vencimiento"
                  fullWidth
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  name="fecha_vencimiento"
                  value={formData.fecha_vencimiento || ''}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                />
              </Grid>
            )}
            <Grid item xs={6}>
              <TextField
                label="Categoría"
                fullWidth
                name="categoria"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Proveedor"
                fullWidth
                name="proveedor"
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Ubicación</InputLabel>
                <Select
                  value={formData.ubicacion || 'bodega_principal'}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  label="Ubicación"
                >
                  {ubicaciones.map((ubi) => (
                    <MenuItem key={ubi.value} value={ubi.value}>
                      {ubi.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button 
            onClick={handleCloseModal}
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
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              }
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Inventario;
