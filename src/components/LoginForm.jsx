import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  useTheme,
  Typography,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  AdminPanelSettings,
  ArrowBack,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginForm = ({ 
  superAdminMode = false, 
  gestorMode = false,
  onSuperAdminLogin = () => {},
  onGestorLogin = () => {},
  onLoginSuccess = () => {},
  onCancel = () => {},
}) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Si está en modo específico, mostrar mensaje y preconfiguraciones
  useEffect(() => {
    if (superAdminMode) {
      setFormData({
        email: 'admin@example.com',
        password: '',
      });
    } else if (gestorMode) {
      setFormData({
        email: 'gestion@usuarios.com',
        password: '',
      });
    } else {
      setFormData({
        email: '',
        password: '',
      });
    }
  }, [superAdminMode, gestorMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Limpiar error específico al cambiar un campo
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verificar credenciales de gestor sin hacer login en la API
      if (gestorMode && 
          formData.email === 'gestion@usuarios.com' && 
          formData.password === 'Patrones123') {
        // Credenciales correctas para modo gestor
        setTimeout(() => {
          onGestorLogin(); // Abrir panel de gestión
          setLoading(false);
        }, 1000);
        return;
      }
      
      // Para login normal o superadmin
      const userData = await login(formData.email, formData.password);
      
      // Verificar si el login fue de superadmin y estamos en modo superadmin
      if (superAdminMode && userData && userData.email === 'admin@example.com') {
        onSuperAdminLogin();
      } else if (!superAdminMode && !gestorMode) {
        onLoginSuccess();
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
      }}
    >
      {(superAdminMode || gestorMode) && (
        <Alert 
          severity="info" 
          icon={gestorMode ? <AdminPanelSettings /> : <AdminPanelSettings />}
          sx={{ 
            mb: 2,
            '& .MuiAlert-icon': {
              color: gestorMode ? '#3f51b5' : theme.palette.primary.main
            }
          }}
        >
          <Typography variant="subtitle2">
            {gestorMode ? 'Acceso a Gestión de Usuarios' : 'Modo Administración'}
          </Typography>
          <Typography variant="body2">
            {gestorMode 
              ? 'Ingresa con tus credenciales de gestor' 
              : 'Ingresa con tus credenciales de superadministrador'}
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            '& .MuiAlert-icon': {
              color: theme.palette.error.main
            }
          }}
        >
          {error}
        </Alert>
      )}

      <TextField
        required
        fullWidth
        label="Correo electrónico"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        variant="outlined"
        disabled={loading}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              '& fieldset': {
                borderWidth: '2px',
                borderColor: gestorMode ? '#3f51b5' : undefined,
              },
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: gestorMode ? '#3f51b5' : undefined,
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email sx={{ color: gestorMode ? '#3f51b5' : theme.palette.primary.main }} />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        required
        fullWidth
        label="Contraseña"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleChange}
        variant="outlined"
        disabled={loading}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              '& fieldset': {
                borderWidth: '2px',
                borderColor: gestorMode ? '#3f51b5' : undefined,
              },
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: gestorMode ? '#3f51b5' : undefined,
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock sx={{ color: gestorMode ? '#3f51b5' : theme.palette.primary.main }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
                disabled={loading}
                sx={{
                  color: gestorMode ? '#3f51b5' : theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ 
        display: 'flex', 
        flexDirection: gestorMode ? 'column' : 'row',
        gap: 2,
        mt: 1
      }}>
        {gestorMode && (
          <Button
            type="button"
            variant="outlined"
            size="large"
            disabled={loading}
            onClick={onCancel}
            startIcon={<ArrowBack />}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              borderColor: '#3f51b5',
              color: '#3f51b5',
              '&:hover': {
                borderColor: '#303f9f',
                backgroundColor: 'rgba(63, 81, 181, 0.04)',
              },
            }}
          >
            Volver al Login
          </Button>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          fullWidth
          sx={{
            py: 1.5,
            position: 'relative',
            fontSize: '1.1rem',
            fontWeight: 600,
            borderRadius: 2,
            background: gestorMode 
              ? 'linear-gradient(135deg, #3f51b5, #303f9f)'
              : superAdminMode 
                ? `linear-gradient(135deg, #2E3B55, #1A2333)` 
                : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(1px)',
            },
            '&:disabled': {
              background: theme.palette.action.disabledBackground,
            },
          }}
        >
          {loading ? (
            <CircularProgress
              size={24}
              sx={{
                color: 'white',
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px',
              }}
            />
          ) : (
            gestorMode
              ? 'Acceder a Gestión'
              : superAdminMode 
                ? 'Acceder a Administración' 
                : 'Iniciar Sesión'
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default LoginForm;