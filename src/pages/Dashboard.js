import React, { useState, useEffect } from "react";
import { Box, Grid, Card, CardContent, Typography, Button, useTheme } from "@mui/material";
import { Inventory, SwapHoriz, BarChart, Warning } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import apiService from "../services/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [dashboardData, setDashboardData] = useState({
    totalInventario: 0,
    notificacionesActivas: 0,
    proximaEntrega: { dias: 0, fecha: '', producto: '', destinatario: '', cantidad: 0 },
    ultimaEntrega: { cantidad: 0, dias: 0, destinatario: '' }
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [inventario, alertas, entregas, cronograma] = await Promise.all([
          apiService.getProductos(),
          apiService.getProductosStockBajo(),
          apiService.getEntregas(),
          apiService.getCronograma()
        ]);

        const totalItems = inventario.reduce((sum, item) => sum + item.cantidad, 0);
        const alertasActivas = alertas.length;
        
        // Obtener la próxima entrega del cronograma
        const proximaEntrega = cronograma
          .filter(e => new Date(e.fecha_entrega) > new Date())
          .sort((a, b) => new Date(a.fecha_entrega) - new Date(b.fecha_entrega))[0] || {};

        const ultimaEntrega = entregas.filter(e => new Date(e.fecha) <= new Date())[0] || {};

        setDashboardData({
          totalInventario: totalItems,
          notificacionesActivas: alertasActivas,
          proximaEntrega: {
            dias: proximaEntrega.fecha_entrega ? Math.ceil((new Date(proximaEntrega.fecha_entrega) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
            fecha: proximaEntrega.fecha_entrega,
            producto: proximaEntrega.producto,
            destinatario: proximaEntrega.destinatario,
            cantidad: proximaEntrega.cantidad
          },
          ultimaEntrega: {
            cantidad: ultimaEntrega.cantidad || 0,
            dias: ultimaEntrega.fecha ? Math.floor((new Date() - new Date(ultimaEntrega.fecha)) / (1000 * 60 * 60 * 24)) : 0,
            destinatario: ultimaEntrega.destinatario || ''
          }
        });
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Botones principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: "center", border: "2px solid #2ecc71" }}>
            <CardContent>
              <Inventory sx={{ fontSize: 50, color: "#2ecc71" }} />
              <Typography variant="h5">Inventario</Typography>
              <Button 
                variant="contained" 
                color="success" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={() => navigate('/inventario')}
              >
                Ver Inventario
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: "center", border: "2px solid #3498db" }}>
            <CardContent>
              <SwapHoriz sx={{ fontSize: 50, color: "#3498db" }} />
              <Typography variant="h5">Movimientos</Typography>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={() => navigate('/Registro_auditoria')}
              >
                Ver Movimientos
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: "center", border: "2px solid #f1c40f" }}>
            <CardContent>
              <BarChart sx={{ fontSize: 50, color: "#f1c40f" }} />
              <Typography variant="h5">Reportes</Typography>
              <Button 
                variant="contained" 
                color="warning" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={() => navigate('/Reportes')}
              >
                Ver Reportes
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: "center", border: "2px solid #e74c3c" }}>
            <CardContent>
              <Warning sx={{ fontSize: 50, color: "#e74c3c" }} />
              <Typography variant="h5">Alertas</Typography>
              <Button 
                variant="contained" 
                color="error" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={() => navigate('/Alertas')}
              >
                Ver Alertas
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tarjetas informativas */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Card 
            sx={{ 
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
              borderColor: 'divider',
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'transform 0.2s ease-in-out',
                boxShadow: theme.shadows[4]
              }
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Inventory sx={{ fontSize: 24, mr: 1, color: theme.palette.primary.main }} />
                Inventario
              </Typography>
              <Typography variant="body1">
                Cantidad de elementos en bodega: <Typography component="span" variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>{dashboardData.totalInventario.toLocaleString()}</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card 
            sx={{ 
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                backgroundColor: theme.palette.warning.main,
                borderRadius: '4px 0 0 4px'
              },
              border: 1,
              borderColor: 'divider',
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'transform 0.2s ease-in-out',
                boxShadow: theme.shadows[4]
              }
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Warning sx={{ fontSize: 24, mr: 1, color: theme.palette.warning.main }} />
                Notificaciones
              </Typography>
              <Typography variant="body1">
                Cantidad de notificaciones activas: <Typography component="span" variant="body1" color="warning.main" sx={{ fontWeight: 'bold' }}>{dashboardData.notificacionesActivas}</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card 
            sx={{ 
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                backgroundColor: theme.palette.info.main,
                borderRadius: '4px 0 0 4px'
              },
              border: 1,
              borderColor: 'divider',
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'transform 0.2s ease-in-out',
                boxShadow: theme.shadows[4]
              }
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <SwapHoriz sx={{ fontSize: 24, mr: 1, color: theme.palette.info.main }} />
                Próxima entrega
              </Typography>
              <Typography variant="body1">
                {dashboardData.proximaEntrega.dias > 0 ? (
                  <>
                    Próxima entrega de <Typography component="span" variant="body1" color="info.main" sx={{ fontWeight: 'bold' }}>{dashboardData.proximaEntrega.cantidad} {dashboardData.proximaEntrega.producto}</Typography> a {dashboardData.proximaEntrega.destinatario} en <Typography component="span" variant="body1" color="info.main" sx={{ fontWeight: 'bold' }}>{dashboardData.proximaEntrega.dias} días</Typography>
                  </>
                ) : (
                  "No hay entregas programadas"
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card 
            sx={{ 
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                backgroundColor: theme.palette.success.main,
                borderRadius: '4px 0 0 4px'
              },
              border: 1,
              borderColor: 'divider',
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'transform 0.2s ease-in-out',
                boxShadow: theme.shadows[4]
              }
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <SwapHoriz sx={{ fontSize: 24, mr: 1, color: theme.palette.success.main }} />
                Última entrega
              </Typography>
              <Typography variant="body1">
                La última entrega fue de <Typography component="span" variant="body1" color="success.main" sx={{ fontWeight: 'bold' }}>{dashboardData.ultimaEntrega.cantidad} elementos</Typography> hace {dashboardData.ultimaEntrega.dias} días a {dashboardData.ultimaEntrega.destinatario}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
