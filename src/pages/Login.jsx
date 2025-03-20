import React from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Inventory } from '@mui/icons-material';

const Login = () => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.primary.dark} 100%)`,
        padding: '20px',
      }}
    >
      <Paper
        elevation={24}
        sx={{
          padding: { xs: 3, sm: 6 },
          width: { xs: '100%', sm: '450px' },
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
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
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4
          }}
        >
          <Box
            sx={{
              backgroundColor: theme.palette.primary.main,
              borderRadius: '50%',
              width: 70,
              height: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: theme.shadows[4]
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
              fontSize: { xs: '1.75rem', sm: '2.25rem' }
            }}
          >
            Bienvenido
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              textAlign: 'center',
              mb: 3
            }}
          >
            Ingresa tus credenciales para continuar
          </Typography>
        </Box>
        <LoginForm />
      </Paper>
    </Box>
  );
};

export default Login;