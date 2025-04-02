import React, { useState } from 'react';
import { Box, Paper, Typography, useTheme, Button, Dialog, IconButton, AppBar, Toolbar } from '@mui/material';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Inventory, Group, Close, AdminPanelSettings } from '@mui/icons-material';
import GestionUsuarios from './GestionUsuarios';

const Login = () => {
  const theme = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [openGestion, setOpenGestion] = useState(false);
  const [modoGestionUsuarios, setModoGestionUsuarios] = useState(false);
  
  // Verificar si el usuario actual es superadmin o gestor de usuarios
  const isAuthorized = user && (
    user.email === 'admin@example.com' || 
    user.email === 'gestion@usuarios.com'
  );

  // Si el usuario está autenticado como administrador normal, redirigir al dashboard
  if (isAuthenticated && !isAuthorized && !openGestion) {
    return <Navigate to="/" replace />;
  }
  
  // Si es gestor de usuarios y no está abierta la gestión, abrir la gestión
  if (isAuthenticated && isAuthorized && !openGestion) {
    setOpenGestion(true);
  }
  
  const handleOpenGestion = () => {
    setModoGestionUsuarios(true);
    // Si ya está autenticado como gestor o admin, abrir directamente
    if (isAuthorized) {
      setOpenGestion(true);
    }
  };
  
  const handleCloseGestion = () => {
    setOpenGestion(false);
    // Si es gestor de usuarios, cerrar sesión al cerrar la gestión
    if (isAuthorized) {
      // Usar setTimeout para evitar renderizado antes de actualizar estado
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  return (
    <Box
      className="login-page"
      sx={{
        height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url(/pattern.svg) repeat',
          opacity: 0.1,
          zIndex: 1,
        },
      }}
    >
      {/* Botón superior para gestión de usuarios */}
      <Button
        variant="contained"
        color="secondary"
        startIcon={<AdminPanelSettings />}
        onClick={handleOpenGestion}
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 10,
          bgcolor: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)',
          color: 'white',
          fontWeight: 'bold',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.25)',
          }
        }}
      >
        Gestión de Usuarios
      </Button>
      
      {/* Formulario de login normal, oculto cuando se está en modo gestión */}
      {!modoGestionUsuarios && (
        <Paper
          elevation={24}
          sx={{
            padding: { xs: 3, sm: 6 },
            width: { xs: '95%', sm: '450px' },
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            zIndex: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '6px',
              background: `linear-gradient(to bottom, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
              borderRadius: '4px 0 0 4px'
            }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Box
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                borderRadius: '50%',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                border: '4px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Inventory sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: theme.palette.primary.main,
                textAlign: 'center',
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                mb: 1,
              }}
            >
              Bienvenido
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.text.secondary,
                textAlign: 'center',
                mb: 3,
                maxWidth: '80%',
              }}
            >
              Ingresa tus credenciales para continuar
            </Typography>
          </Box>
          <LoginForm onLoginSuccess={() => setOpenGestion(false)} />
        </Paper>
      )}
      
      {/* Formulario de gestión de usuarios, mostrado cuando se hace clic en el botón o cuando se está en modo gestión */}
      {modoGestionUsuarios && !openGestion && (
        <Paper
          elevation={24}
          sx={{
            padding: { xs: 3, sm: 6 },
            width: { xs: '95%', sm: '450px' },
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            zIndex: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '6px',
              background: `linear-gradient(to bottom, #3f51b5, #303f9f)`,
              borderRadius: '4px 0 0 4px'
            }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Box
              sx={{
                background: `linear-gradient(135deg, #3f51b5, #303f9f)`,
                borderRadius: '50%',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                border: '4px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <AdminPanelSettings sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: '#3f51b5',
                textAlign: 'center',
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                mb: 1,
              }}
            >
              Gestión de Usuarios
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.text.secondary,
                textAlign: 'center',
                mb: 3,
                maxWidth: '80%',
              }}
            >
              Acceso al sistema de administración
            </Typography>
          </Box>
          <LoginForm 
            gestorMode={true} 
            onGestorLogin={() => setOpenGestion(true)} 
            onCancel={() => setModoGestionUsuarios(false)}
          />
        </Paper>
      )}
      
      {/* Diálogo modal para gestión de usuarios */}
      <Dialog
        fullScreen
        open={openGestion}
        onClose={handleCloseGestion}
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: theme.palette.background.default
          }
        }}
      >
        <AppBar position="sticky" color="primary" elevation={0}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleCloseGestion}
              aria-label="close"
            >
              <Close />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
              Gestión de Usuarios
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 2 }}>
          <GestionUsuarios esGestor={true} />
        </Box>
      </Dialog>
    </Box>
  );
};

export default Login;