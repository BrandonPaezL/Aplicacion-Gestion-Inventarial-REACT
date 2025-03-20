import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person,
  Email,
  Badge,
  CalendarToday,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Perfil = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 120,
              height: 120,
              bgcolor: 'primary.main',
              fontSize: '3rem',
              mb: 2,
            }}
          >
            {user.user.name.charAt(0)}
          </Avatar>
          <Typography variant="h4" component="h1" gutterBottom>
            {user.user.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {user.user.role === 'admin' ? 'Administrador' : 'Usuario'}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Información Personal
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Person color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Nombre"
                  secondary={user.user.name}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Email color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Correo Electrónico"
                  secondary={user.user.email}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Badge color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Rol"
                  secondary={user.user.role === 'admin' ? 'Administrador' : 'Usuario'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CalendarToday color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Último Acceso"
                  secondary={new Date().toLocaleString()}
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Perfil; 