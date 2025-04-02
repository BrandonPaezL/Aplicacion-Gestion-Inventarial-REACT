import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Alert,
  FormHelperText,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { Delete, Edit, PersonAdd, AdminPanelSettings, Person, Add, Business } from '@mui/icons-material';
import axiosInstance from '../config/axios';
import { useAuth } from '../context/AuthContext';

const GestionUsuarios = ({ esGestor = false }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    unidad_id: '',
    rol: 'usuario'
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [openUnidadDialog, setOpenUnidadDialog] = useState(false);
  const [nuevaUnidad, setNuevaUnidad] = useState({
    nombre: '',
    descripcion: ''
  });
  const [loadingUnidad, setLoadingUnidad] = useState(false);
  const [errorUnidad, setErrorUnidad] = useState('');

  // Verificar si el usuario actual es superadmin o gestor
  const isAuthorized = esGestor || (user && (
    user.email === 'admin@example.com' || 
    user.email === 'gestion@usuarios.com'
  ));

  useEffect(() => {
    // Siempre intentar cargar datos si es gestor
    fetchUsers();
    fetchUnidades();
  }, []);

  useEffect(() => {
    if (formData.unidad_id === '' && unidades.length > 0) {
      setFormData(prev => ({
        ...prev,
        unidad_id: unidades[0].id.toString()
      }));
    }
  }, [unidades]);

  const fetchUsers = async () => {
    try {
      // Usar credentials especiales para el gestor
      const headers = {};
      if (esGestor) {
        headers['X-User-Email'] = 'gestion@usuarios.com';
        headers['X-User-Role'] = 'admin';
      } else if (user) {
        headers['X-User-Id'] = user.id;
        headers['X-User-Name'] = user.name;
        headers['X-User-Role'] = user.rol;
        headers['X-User-Email'] = user.email;
      }

      const response = await axiosInstance.get('/api/usuarios', { headers });
      setUsers(response.data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      setError('No se pudieron cargar los usuarios. ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchUnidades = async () => {
    try {
      // Usar credentials especiales para el gestor
      const headers = {};
      if (esGestor) {
        headers['X-User-Email'] = 'gestion@usuarios.com';
        headers['X-User-Role'] = 'admin';
      } else if (user) {
        headers['X-User-Id'] = user.id;
        headers['X-User-Name'] = user.name;
        headers['X-User-Role'] = user.rol;
        headers['X-User-Email'] = user.email;
      }

      const response = await axiosInstance.get('/api/unidades', { headers });
      setUnidades(response.data);
    } catch (error) {
      console.error('Error al obtener unidades:', error);
      setError('No se pudieron cargar las unidades. ' + (error.response?.data?.message || error.message));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es requerido';
    if (!formData.email.trim()) errors.email = 'El correo es requerido';
    if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'El correo no es válido';
    if (!formData.password.trim()) errors.password = 'La contraseña es requerida';
    if (formData.password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres';
    if (!formData.unidad_id) errors.unidad_id = 'Debe seleccionar una unidad';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Asegurarse de manejar correctamente los valores
    let newValue = value;
    if (name === 'unidad_id' && value !== '') {
      // Garantizar que unidad_id siempre sea string
      newValue = String(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Limpiar error específico al cambiar un campo
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Usar credentials especiales para el gestor
      const headers = {};
      if (esGestor) {
        headers['X-User-Email'] = 'gestion@usuarios.com';
        headers['X-User-Role'] = 'admin';
      } else if (user) {
        headers['X-User-Id'] = user.id;
        headers['X-User-Name'] = user.name;
        headers['X-User-Role'] = user.rol;
        headers['X-User-Email'] = user.email;
      }

      const response = await axiosInstance.post('/api/usuarios', formData, { headers });
      
      setSuccess('Usuario creado exitosamente');
      setFormData({
        nombre: '',
        email: '',
        password: '',
        unidad_id: '',
        rol: 'usuario'
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      setError(error.response?.data?.message || 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este usuario?')) {
      return;
    }
    
    try {
      // Usar credentials especiales para el gestor
      const headers = {};
      if (esGestor) {
        headers['X-User-Email'] = 'gestion@usuarios.com';
        headers['X-User-Role'] = 'admin';
      } else if (user) {
        headers['X-User-Id'] = user.id;
        headers['X-User-Name'] = user.name;
        headers['X-User-Role'] = user.rol;
        headers['X-User-Email'] = user.email;
      }

      await axiosInstance.delete(`/api/usuarios/${id}`, { headers });
      setSuccess('Usuario eliminado correctamente');
      fetchUsers();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setError('No se pudo eliminar el usuario. ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateUnidad = async () => {
    try {
      setLoadingUnidad(true);
      setErrorUnidad(null);

      if (!nuevaUnidad.nombre.trim()) {
        setErrorUnidad('El nombre de la unidad es requerido');
        return;
      }

      const response = await axiosInstance.post('/unidades', nuevaUnidad, {
        headers: {
          'X-User-Email': 'gestion@usuarios.com',
          'X-User-Role': 'admin'
        }
      });

      console.log('Unidad creada:', response.data);
      setUnidades([...unidades, response.data]);
      setOpenUnidadDialog(false);
      setNuevaUnidad({
        nombre: '',
        descripcion: ''
      });
    } catch (error) {
      console.error('Error al crear unidad:', error);
      setErrorUnidad('Error al crear la unidad');
    } finally {
      setLoadingUnidad(false);
    }
  };

  // Renderizar el diálogo para crear unidad
  const renderUnidadDialog = () => (
    <Dialog open={openUnidadDialog} onClose={() => setOpenUnidadDialog(false)}>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <Business sx={{ mr: 1 }} />
          Crear Nueva Unidad/Centro
        </Box>
      </DialogTitle>
      <DialogContent>
        {errorUnidad && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorUnidad}
          </Alert>
        )}
        <TextField
          fullWidth
          label="Nombre de la Unidad/Centro"
          value={nuevaUnidad.nombre}
          onChange={(e) => setNuevaUnidad(prev => ({ ...prev, nombre: e.target.value }))}
          margin="normal"
          required
          error={!!errorUnidad && !nuevaUnidad.nombre}
          helperText={errorUnidad && !nuevaUnidad.nombre ? 'El nombre es requerido' : ''}
        />
        <TextField
          fullWidth
          label="Descripción"
          value={nuevaUnidad.descripcion}
          onChange={(e) => setNuevaUnidad(prev => ({ ...prev, descripcion: e.target.value }))}
          margin="normal"
          multiline
          rows={3}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenUnidadDialog(false)}>Cancelar</Button>
        <Button 
          onClick={handleCreateUnidad} 
          color="primary" 
          variant="contained"
          disabled={loadingUnidad}
          startIcon={loadingUnidad ? <CircularProgress size={20} color="inherit" /> : <Add />}
        >
          Crear Unidad
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (!isAuthorized) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Alert severity="error">
          No tienes acceso a esta sección. Solo el administrador del sistema puede acceder.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gestión de Usuarios
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          <PersonAdd sx={{ mr: 1, verticalAlign: 'middle' }} />
          Crear Nuevo Usuario
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                margin="normal"
                error={!!validationErrors.nombre}
                helperText={validationErrors.nombre}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Correo Electrónico"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                error={!!validationErrors.email}
                helperText={validationErrors.email}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contraseña"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                error={!!validationErrors.password}
                helperText={validationErrors.password}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" error={!!validationErrors.unidad_id}>
                <InputLabel>Unidad/Centro</InputLabel>
                <Select
                  name="unidad_id"
                  value={formData.unidad_id || ''}
                  onChange={handleChange}
                  label="Unidad/Centro"
                >
                  {unidades.map(unidad => (
                    <MenuItem key={unidad.id} value={String(unidad.id)}>
                      {unidad.nombre}
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem 
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenUnidadDialog(true);
                    }}
                    sx={{ 
                      color: 'primary.main',
                      fontWeight: 'bold',
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                    }}
                  >
                    <ListItemIcon>
                      <Add color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Agregar Nueva Unidad/Centro" />
                  </MenuItem>
                </Select>
                {validationErrors.unidad_id && (
                  <FormHelperText>{validationErrors.unidad_id}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Rol</InputLabel>
                <Select
                  name="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  label="Rol"
                >
                  <MenuItem value="usuario">Usuario</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Crear Usuario'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
      
      <Divider sx={{ my: 4 }} />
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Usuarios Registrados
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Correo</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Unidad</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length > 0 ? (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.nombre}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.rol === 'admin' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AdminPanelSettings color="primary" sx={{ mr: 1 }} />
                          Administrador
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person color="info" sx={{ mr: 1 }} />
                          Usuario
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{user.unidad_nombre}</TableCell>
                    <TableCell>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDeleteUser(user.id)}
                        title="Eliminar usuario"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Diálogo para crear nueva unidad */}
      {renderUnidadDialog()}
    </Box>
  );
};

export default GestionUsuarios; 