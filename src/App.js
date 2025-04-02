import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { 
  Box, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Inventario from "./pages/Inventario";
import Reportes from "./pages/Reportes";
import Alertas from "./pages/Alertas";
import EntregaProductos from "./pages/Entrega_productos";
import RegistroAuditoria from "./pages/Registro_auditoria";
import Cronograma from "./pages/Cronograma";
import Login from "./pages/Login";
import Perfil from "./pages/Perfil";
import GestionUsuarios from "./pages/GestionUsuarios";
import { createTheme, ThemeProvider } from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { SnackbarProvider } from 'notistack';
import { useAuth } from './context/AuthContext';

// Estilos globales para eliminar márgenes
const globalStyles = {
  '*': {
    boxSizing: 'border-box',
  },
  'html, body': {
    margin: 0,
    padding: 0,
    height: '100%',
    width: '100%',
  },
  '#root': {
    height: '100%',
    width: '100%',
  },
  // Solo aplicar estos estilos cuando estamos en la página de login
  'body:has(.login-page)': {
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }
};

// Componente de ruta protegida
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Componente de ruta protegida para superadmin
const SuperAdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const isAuthorized = user && (
    user.email === 'admin@example.com' || 
    user.email === 'gestion@usuarios.com'
  );
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return isAuthorized ? children : <Navigate to="/" replace />;
};

function App() {
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const theme = createTheme({
    components: {
      MuiCssBaseline: {
        styleOverrides: globalStyles,
      },
    },
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: '#0A1929',
        light: '#1A2B3B',
        dark: '#050E17',
      },
      background: {
        default: darkMode ? '#0A1929' : '#ffffff',
        paper: darkMode ? '#1A2B3B' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
  });

  return (
    <SnackbarProvider maxSnack={3}>
      <ThemeProvider theme={theme}>
        <Router>
          <Box sx={{ 
            display: "flex",
            margin: 0,
            padding: 0,
            minHeight: '100vh',
            width: '100%',
            overflow: 'hidden'
          }}>
            <CssBaseline />
            {isAuthenticated && (
              <>
                <AppBar position="fixed" sx={{ 
                  width: `calc(100% - ${open ? 240 : 0}px)`, 
                  ml: open ? "240px" : 0,
                  zIndex: (theme) => theme.zIndex.drawer + 1,
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }}>
                  <Toolbar sx={{ 
                    minHeight: '72px !important',
                    px: 3
                  }}>
                    <IconButton 
                      color="inherit" 
                      edge="start" 
                      onClick={handleDrawerToggle} 
                      sx={{ 
                        mr: 2,
                        width: 45,
                        height: 45
                      }}
                    >
                      <MenuIcon sx={{ fontSize: 28 }} />
                    </IconButton>
                    <Typography 
                      variant="h6" 
                      noWrap 
                      sx={{ 
                        fontSize: '1.3rem',
                        fontWeight: 600
                      }}
                    >
                      Gestión Inventarial
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton 
                      onClick={() => setDarkMode(!darkMode)} 
                      color="inherit" 
                      sx={{ 
                        mr: 2,
                        width: 45,
                        height: 45
                      }}
                    >
                      {darkMode ? <Brightness7 sx={{ fontSize: 26 }} /> : <Brightness4 sx={{ fontSize: 26 }} />}
                    </IconButton>
                    <Tooltip title="Configuración de cuenta">
                      <IconButton
                        onClick={handleMenu}
                        color="inherit"
                        sx={{
                          width: 45,
                          height: 45
                        }}
                      >
                        <Avatar sx={{ 
                          width: 38, 
                          height: 38, 
                          bgcolor: 'primary.main',
                          fontSize: '1.2rem'
                        }}>
                          {user?.user?.name?.charAt(0) || <PersonIcon sx={{ fontSize: 24 }} />}
                        </Avatar>
                      </IconButton>
                    </Tooltip>
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl)}
                      onClose={handleClose}
                      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    >
                      <MenuItem disabled>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                          {user?.user?.name}
                        </Typography>
                      </MenuItem>
                      <MenuItem disabled>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {user?.user?.email}
                        </Typography>
                      </MenuItem>
                      <MenuItem onClick={handleLogout}>
                        <LogoutIcon sx={{ mr: 1 }} />
                        Cerrar Sesión
                      </MenuItem>
                    </Menu>
                  </Toolbar>
                </AppBar>
                <Sidebar open={open} handleDrawerToggle={handleDrawerToggle} />
              </>
            )}
            <Box component="main" sx={{ 
              flexGrow: 1, 
              p: isAuthenticated ? 3 : 0,
              width: '100%',
              minHeight: '100vh',
              ...(isAuthenticated && {
                paddingTop: '72px', // nueva altura del AppBar
                paddingLeft: open ? '240px' : 0,
                transition: theme => theme.transitions.create(['padding'], {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.leavingScreen,
                }),
              })
            }}>
              <Routes>
                <Route path="/login" element={
                  isAuthenticated ? <Navigate to="/" replace /> : <Login />
                } />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/inventario" element={
                  <ProtectedRoute>
                    <Inventario />
                  </ProtectedRoute>
                } />
                <Route path="/reportes" element={
                  <ProtectedRoute>
                    <Reportes />
                  </ProtectedRoute>
                } />
                <Route path="/alertas" element={
                  <ProtectedRoute>
                    <Alertas />
                  </ProtectedRoute>
                } />
                <Route path="/entrega_productos" element={
                  <ProtectedRoute>
                    <EntregaProductos />
                  </ProtectedRoute>
                } />
                <Route path="/registro_auditoria" element={
                  <ProtectedRoute>
                    <RegistroAuditoria />
                  </ProtectedRoute>
                } />
                <Route path="/cronograma" element={
                  <ProtectedRoute>
                    <Cronograma />
                  </ProtectedRoute>
                } />
                <Route path="/perfil" element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                } />
                <Route path="/gestion-usuarios" element={
                  <SuperAdminRoute>
                    <GestionUsuarios />
                  </SuperAdminRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </ThemeProvider>
    </SnackbarProvider>
  );
}

export default App;
