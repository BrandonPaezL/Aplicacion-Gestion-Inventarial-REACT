app.post('/api/unidades', verificarSuperAdmin, async (req, res) => {
  const { codigo, nombre, descripcion } = req.body;
  let connection;
  
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO unidades (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );
    
    await registrarAuditoria({
      usuario_nombre: req.headers['x-user-name'] || req.user?.name || 'Sistema',
      usuario_id: req.headers['x-user-id'] || req.user?.id || null,
      accion: 'creación',
      detalles: `Se creó la unidad ${nombre}`,
      tabla_afectada: 'unidades',
      registro_id: result.insertId
    });

    res.status(201).json({
      message: 'Unidad creada exitosamente',
      id: result.insertId,
      nombre: nombre
    });
  } catch (err) {
    console.error('Error al crear unidad:', err);
    res.status(500).json({ message: 'Error al crear la unidad', error: err.message });
  } finally {
    if (connection) connection.release();
  }
}); 