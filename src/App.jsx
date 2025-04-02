import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Reportes from './pages/Reportes';
import RegistroAuditoria from './pages/Registro_auditoria';
import Cronograma from './pages/Cronograma';
import Perfil from './pages/Perfil';
import Administracion from './pages/Administracion';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Componente para proteger rutas que requieren autenticación
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Cargando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Componente para proteger rutas que requieren rol de administrador
const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) {
    return <div>Cargando...</div>;
  }
  
  if (!user || !isAdmin) {
    return <Navigate to="/" />;
  }
  
  return children;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Navigation />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/inventario"
              element={
                <PrivateRoute>
                  <Inventario />
                </PrivateRoute>
              }
            />
            <Route
              path="/reportes"
              element={
                <PrivateRoute>
                  <Reportes />
                </PrivateRoute>
              }
            />
            <Route
              path="/registro-auditoria"
              element={
                <PrivateRoute>
                  <RegistroAuditoria />
                </PrivateRoute>
              }
            />
            <Route
              path="/cronograma"
              element={
                <PrivateRoute>
                  <Cronograma />
                </PrivateRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <PrivateRoute>
                  <Perfil />
                </PrivateRoute>
              }
            />
            <Route
              path="/administracion"
              element={
                <AdminRoute>
                  <Administracion />
                </AdminRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 