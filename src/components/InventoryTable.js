import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from "@mui/material";

const data = [
  { fecha: "20 de enero de 2025", elemento: "Casco", cantidad: 10, responsable: "Brandon Paez" },
  { fecha: "30 de enero de 2025", elemento: "Cinta de Seguridad", cantidad: 10, responsable: "Marta Pino" },
  { fecha: "2 de febrero de 2025", elemento: "Señalética cilindros de oxígeno", cantidad: 2, responsable: "Brandon Paez" }
];

const InventoryTable = () => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Fecha</TableCell>
            <TableCell>Elemento</TableCell>
            <TableCell>Cantidad</TableCell>
            <TableCell>Responsable</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.fecha}</TableCell>
              <TableCell>{row.elemento}</TableCell>
              <TableCell>{row.cantidad}</TableCell>
              <TableCell>{row.responsable}</TableCell>
              <TableCell>
                <Button variant="contained" color="primary" size="small">Editar</Button>
                <Button variant="contained" color="error" size="small" style={{ marginLeft: 10 }}>Eliminar</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default InventoryTable;