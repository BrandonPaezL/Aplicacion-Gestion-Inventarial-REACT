import { Link } from "react-router-dom";
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from "@mui/material";
import { Dashboard, Inventory, Assessment, Warning, LocalShipping, History, CalendarToday, Person } from "@mui/icons-material";

const Sidebar = ({ open, handleDrawerToggle }) => {
  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={handleDrawerToggle}
      sx={{ "& .MuiDrawer-paper": { width: 240, boxSizing: "border-box" } }}
    >
      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/">
            <ListItemIcon><Dashboard /></ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/inventario">
            <ListItemIcon><Inventory /></ListItemIcon>
            <ListItemText primary="Inventario" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/Reportes">
            <ListItemIcon><Assessment /></ListItemIcon>
            <ListItemText primary="Reportes" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/Alertas">
            <ListItemIcon><Warning /></ListItemIcon>
            <ListItemText primary="Alertas" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/Entrega_productos">
            <ListItemIcon><LocalShipping /></ListItemIcon>
            <ListItemText primary="Entrega de Productos" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/Registro_auditoria">
            <ListItemIcon><History /></ListItemIcon>
            <ListItemText primary="Registro de Auditoría" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/Cronograma">
            <ListItemIcon><CalendarToday /></ListItemIcon>
            <ListItemText primary="Cronograma" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/perfil">
            <ListItemIcon><Person /></ListItemIcon>
            <ListItemText primary="Mi Perfil" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
