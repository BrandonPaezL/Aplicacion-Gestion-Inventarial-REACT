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
import { createTheme, ThemeProvider } from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { SnackbarProvider } from 'notistack';
import { useAuth } from './context/AuthContext';

// Componente de ruta protegida
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
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
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: '#1976d2',
      },
    },
  });

  return (
    <SnackbarProvider maxSnack={3}>
      <ThemeProvider theme={theme}>
        <Router>
          <Box sx={{ display: "flex" }}>
            <CssBaseline />
            {isAuthenticated && (
              <>
                <AppBar position="fixed" sx={{ width: `calc(100% - ${open ? 240 : 0}px)`, ml: open ? "240px" : 0 }}>
                  <Toolbar>
                    <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
                      <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap>Gestión Inventarial</Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit" sx={{ mr: 2 }}>
                      {darkMode ? <Brightness7 /> : <Brightness4 />}
                    </IconButton>
                    <Tooltip title="Configuración de cuenta">
                      <IconButton
                        onClick={handleMenu}
                        color="inherit"
                      >
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {user?.user?.name?.charAt(0) || <PersonIcon />}
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
            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: isAuthenticated ? 8 : 0 }}>
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
