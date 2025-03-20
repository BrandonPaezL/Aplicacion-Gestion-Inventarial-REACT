const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const mysql2 = require('mysql2/promise');

// Configuración de CORS
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-User-Name', 
    'X-User-Id', 
    'X-User-Role'
  ],
  credentials: true
}));

// Middleware para parsear JSON
app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Middleware para servir archivos estáticos
app.use('/reportes', express.static(path.join(__dirname, 'reportes')));

// Middleware para verificar autenticación y extraer información del usuario
app.use((req, res, next) => {
  const userName = req.headers['x-user-name'] || req.headers['user-name'];
  const userId = req.headers['x-user-id'] || req.headers['user-id'];
  const userRole = req.headers['x-user-role'] || req.headers['user-role'];

  if (!userName) {
    console.warn('⚠️ Petición sin nombre de usuario');
  }

  // Añadir información del usuario al objeto req para uso posterior
  req.user = {
    name: userName || 'Sistema',
    id: userId,
    role: userRole
  };

  next();
});

// Configuración de la base de datos con autenticación actualizada
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Patrones123',
  database: 'inventario_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función para registrar auditoría
async function registrarAuditoria(datos) {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Validar que tengamos la información necesaria
    if (!datos.usuario_nombre || !datos.accion) {
      console.error('❌ Datos de auditoría incompletos:', datos);
      throw new Error('Datos de auditoría incompletos');
    }

    // Asegurarse de que detalles sea un objeto
    const detalles = datos.detalles || {};
    
    // Convertir a JSON string de manera segura
    let detallesJSON;
    try {
      detallesJSON = JSON.stringify(detalles);
    } catch (error) {
      console.error('❌ Error al convertir detalles a JSON:', error);
      detallesJSON = JSON.stringify({ error: 'Error al procesar detalles' });
    }

    console.log('Insertando auditoría con datos:', {
      usuario_id: datos.usuario_id || null,
      usuario_nombre: datos.usuario_nombre,
      accion: datos.accion,
      tabla_afectada: datos.tabla_afectada || null,
      registro_id: datos.registro_id || null,
      detalles: detallesJSON
    });

    // Insertar el registro de auditoría
    const [result] = await connection.query(
      `INSERT INTO auditoria 
       (usuario_id, usuario_nombre, accion, tabla_afectada, registro_id, detalles) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        datos.usuario_id || null,
        datos.usuario_nombre,
        datos.accion,
        datos.tabla_afectada || null,
        datos.registro_id || null,
        detallesJSON
      ]
    );

    console.log('✅ Auditoría registrada:', {
      id: result.insertId,
      usuario: datos.usuario_nombre,
      accion: datos.accion
    });

    return result.insertId;
  } catch (err) {
    console.error('❌ Error al registrar auditoría:', err);
    console.error('Stack trace:', err.stack);
    // No lanzar el error, solo registrarlo
    return null;
  } finally {
    if (connection) connection.release();
  }
}

// Verificar conexión inicial
async function verificarConexion() {
  try {
    const connection = await pool.getConnection();
    console.log('Conexión a la base de datos establecida correctamente');
    
    // Crear tabla de auditoría si no existe
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario VARCHAR(255) NOT NULL,
        accion VARCHAR(255) NOT NULL,
        detalles TEXT,
        tabla_afectada VARCHAR(255),
        id_registro INT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla de auditoría verificada/creada correctamente');

    // Crear tabla de entregas si no existe
    await connection.query(`
      CREATE TABLE IF NOT EXISTS entregas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        producto VARCHAR(255) NOT NULL,
        cantidad INT NOT NULL,
        destinatario VARCHAR(255) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla de entregas verificada/creada correctamente');
    
    connection.release();
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    process.exit(1);
  }
}

verificarConexion();

// Ruta de prueba
app.get('/test', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

// Ruta GET productos simplificada
app.get('/productos', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query('SELECT * FROM productos');
    res.json(results);
  } catch (err) {
    console.error('Error en la consulta:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para agregar un producto
app.post('/productos', async (req, res) => {
  const { nombre, cantidad, fecha_vencimiento, categoria, proveedor } = req.body;
  let connection;
  
  try {
    connection = await pool.getConnection();
    const sql = `
      INSERT INTO productos 
      (nombre, cantidad, fecha_vencimiento, categoria, proveedor) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.query(sql, [nombre, cantidad, fecha_vencimiento, categoria, proveedor]);
    
    await registrarAuditoria(
      req.user.name,
      'creación',
      `Se creó el producto ${nombre} con cantidad inicial de ${cantidad}`,
      'productos',
      result.insertId
    );

    res.status(201).json({
      message: 'Producto creado exitosamente',
      id: result.insertId
    });
  } catch (err) {
    console.error('Error al insertar producto:', err);
    res.status(500).json({ 
      error: 'Error al crear el producto',
      details: err.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para eliminar un producto
app.delete('/productos/:id', async (req, res) => {
  const { id } = req.params;
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // Obtener información del producto antes de eliminarlo
    const [producto] = await connection.query('SELECT * FROM productos WHERE id = ?', [id]);
    
    if (!producto || producto.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    const sql = 'DELETE FROM productos WHERE id = ?';
    await connection.query(sql, [id]);
    
    await registrarAuditoria(
      req.user.name,
      'eliminación',
      `Se eliminó el producto ${producto[0].nombre}`,
      'productos',
      id
    );

    res.json({ message: '✅ Producto eliminado' });
  } catch (err) {
    console.error('❌ Error eliminando producto:', err);
    res.status(500).send('Error en el servidor');
  } finally {
    if (connection) connection.release();
  }
});

// Ruta raíz para verificar que el servidor funciona
app.get('/', (req, res) => {
    res.send('🚀 Servidor funcionando correctamente!');
});

// Ruta para actualizar un producto
app.put('/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, cantidad, fecha_vencimiento, categoria, proveedor, ubicacion } = req.body;
  const userName = req.headers['x-user-name'] || req.headers['user-name'] || 'Sistema';
  let connection;
  
  console.log('=== Inicio de actualización de producto ===');
  console.log('ID del producto:', id);
  console.log('Datos recibidos:', {
    nombre,
    cantidad,
    fecha_vencimiento,
    categoria,
    proveedor,
    ubicacion
  });
  console.log('Headers:', req.headers);
  
  try {
    // Validar campos requeridos
    if (!nombre || cantidad === undefined || cantidad === null) {
      console.log('❌ Campos requeridos faltantes:', { nombre, cantidad });
      return res.status(400).json({ 
        error: "Nombre y cantidad son requeridos",
        detalles: { nombre: !!nombre, cantidad: cantidad }
      });
    }

    // Validar cantidad
    const cantidadNumerica = parseInt(cantidad);
    if (isNaN(cantidadNumerica)) {
      console.log('❌ Cantidad inválida:', cantidad);
      return res.status(400).json({ 
        error: "La cantidad debe ser un número válido",
        valorRecibido: cantidad
      });
    }

    connection = await pool.getConnection();
    console.log('✅ Conexión establecida');

    // Verificar si el producto existe
    const [productoExistente] = await connection.query(
      'SELECT * FROM productos WHERE id = ?',
      [id]
    );

    if (!productoExistente || productoExistente.length === 0) {
      console.log('❌ Producto no encontrado:', id);
      return res.status(404).json({ 
        error: "Producto no encontrado",
        id: id
      });
    }

    console.log('✅ Producto encontrado:', productoExistente[0]);

    // Formatear fecha si existe
    let fechaFormateada = null;
    if (fecha_vencimiento) {
      try {
        fechaFormateada = dayjs(fecha_vencimiento).format('YYYY-MM-DD');
        console.log('✅ Fecha formateada:', fechaFormateada);
      } catch (error) {
        console.error('❌ Error al formatear fecha:', error);
        return res.status(400).json({ 
          error: "Formato de fecha inválido",
          fechaRecibida: fecha_vencimiento,
          detalles: error.message
        });
      }
    }

    // Preparar query y parámetros
    const sql = `
      UPDATE productos 
      SET nombre = ?, 
          cantidad = ?, 
          fecha_vencimiento = ?, 
          categoria = ?, 
          proveedor = ?, 
          ubicacion = ?
      WHERE id = ?
    `;
    
    const params = [
      nombre,
      cantidadNumerica,
      fechaFormateada,
      categoria || null,
      proveedor || null,
      ubicacion || 'bodega_principal',
      id
    ];

    console.log('Query a ejecutar:', sql);
    console.log('Parámetros:', params);

    try {
      const [updateResult] = await connection.query(sql, params);
      console.log('✅ Resultado de actualización:', updateResult);

      if (updateResult.affectedRows === 0) {
        throw new Error('No se actualizó ningún registro');
      }

      // Registrar auditoría
      await registrarAuditoria({
        usuario_nombre: userName,
        accion: 'modificación',
        detalles: {
          mensaje: `Se modificó el producto ${nombre}`,
          cambios: {
            anterior: productoExistente[0],
            nuevo: {
              nombre,
              cantidad: cantidadNumerica,
              fecha_vencimiento: fechaFormateada,
              categoria,
              proveedor,
              ubicacion
            }
          }
        },
        tabla_afectada: 'productos',
        registro_id: id
      });

      res.json({
        message: '✅ Producto actualizado correctamente',
        producto: {
          id,
          nombre,
          cantidad: cantidadNumerica,
          fecha_vencimiento: fechaFormateada,
          categoria,
          proveedor,
          ubicacion
        }
      });

    } catch (queryError) {
      console.error('❌ Error en la consulta SQL:', queryError);
      console.error('Detalles del error SQL:', {
        code: queryError.code,
        errno: queryError.errno,
        sqlMessage: queryError.sqlMessage,
        sqlState: queryError.sqlState,
        sql: queryError.sql
      });
      throw {
        ...queryError,
        detalles: {
          sql: queryError.sql,
          params: params,
          message: queryError.message
        }
      };
    }

  } catch (err) {
    console.error('❌ Error general:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({
      error: "Error actualizando producto",
      detalles: err.message,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState,
      codigo: err.code,
      params: err.detalles?.params
    });
  } finally {
    if (connection) {
      connection.release();
      console.log('Conexión liberada');
    }
    console.log('=== Fin de actualización de producto ===');
  }
});

// Rutas para entregas
// Obtener todas las entregas
app.get('/entregas', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query('SELECT * FROM entregas ORDER BY fecha DESC');
    res.json(results);
  } catch (err) {
    console.error('❌ Error obteniendo entregas:', err);
    res.status(500).send('Error en el servidor');
  } finally {
    if (connection) connection.release();
  }
});

// Obtener una entrega específica
app.get('/entregas/:id', async (req, res) => {
  const { id } = req.params;
  let connection;
  
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query('SELECT * FROM entregas WHERE id = ?', [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: "Entrega no encontrada" });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('❌ Error obteniendo entrega:', err);
    res.status(500).json({ error: "Error obteniendo entrega" });
  } finally {
    if (connection) connection.release();
  }
});

// Crear una nueva entrega
app.post('/entregas', async (req, res) => {
  console.log('Headers recibidos:', req.headers);
  console.log('Body completo:', req.body);
  
  // Asegurarse de que tenemos un objeto para trabajar
  const datos = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  
  // Extraer y limpiar los datos
  const producto = datos.producto ? String(datos.producto).trim() : '';
  const cantidad = parseInt(datos.cantidad);
  const destinatario = datos.destinatario ? String(datos.destinatario).trim() : '';

  // Obtener información del usuario desde los headers
  const userName = req.headers['x-user-name'] || req.headers['user-name'] || 'Sistema';
  const userId = req.headers['x-user-id'] || req.headers['user-id'] || '0';

  console.log('Datos procesados:', { producto, cantidad, destinatario, userName, userId });
  
  // Validaciones
  if (!producto || producto.length === 0) {
    return res.status(400).json({ 
      error: "El producto es requerido",
      campo: "producto"
    });
  }

  if (!destinatario || destinatario.length === 0) {
    return res.status(400).json({ 
      error: "El destinatario es requerido",
      campo: "destinatario"
    });
  }

  if (isNaN(cantidad) || cantidad <= 0) {
    return res.status(400).json({ 
      error: "La cantidad debe ser un número positivo",
      campo: "cantidad"
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    
    const [result] = await connection.query(
      'INSERT INTO entregas (producto, cantidad, destinatario) VALUES (?, ?, ?)',
      [producto, cantidad, destinatario]
    );

    // Preparar datos de auditoría
    const datosAuditoria = {
      usuario_nombre: userName,
      usuario_id: userId,
      accion: 'entrega',
      detalles: {
        producto,
        cantidad,
        destinatario,
        ip: req.ip,
        user_agent: req.headers['user-agent']
      },
      tabla_afectada: 'entregas',
      registro_id: result.insertId
    };

    await registrarAuditoria(datosAuditoria);

    res.status(201).json({
      message: "✅ Entrega registrada con éxito",
      id: result.insertId
    });
  } catch (err) {
    console.error('❌ Error insertando entrega:', err);
    res.status(500).json({ error: "Error insertando entrega" });
  } finally {
    if (connection) connection.release();
  }
});

// Actualizar una entrega
app.put('/entregas/:id', async (req, res) => {
  const { id } = req.params;
  const { producto, cantidad, destinatario } = req.body;
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // Obtener datos anteriores para auditoría
    const [entregaAnterior] = await connection.query('SELECT * FROM entregas WHERE id = ?', [id]);
    
    await connection.query(
      'UPDATE entregas SET producto = ?, cantidad = ?, destinatario = ? WHERE id = ?',
      [producto, cantidad, destinatario, id]
    );

    await registrarAuditoria(
      req.user.name,
      'modificación',
      `Se modificó la entrega ID ${id}. Cambios: ${JSON.stringify({
        producto: { anterior: entregaAnterior[0].producto, nuevo: producto },
        cantidad: { anterior: entregaAnterior[0].cantidad, nuevo: cantidad },
        destinatario: { anterior: entregaAnterior[0].destinatario, nuevo: destinatario }
      })}`,
      'entregas',
      id
    );

    res.json({ message: '✅ Entrega actualizada correctamente' });
  } catch (err) {
    console.error('Error actualizando entrega:', err);
    res.status(500).json({ error: "Error actualizando entrega" });
  } finally {
    if (connection) connection.release();
  }
});

// Eliminar una entrega
app.delete('/entregas/:id', async (req, res) => {
  const { id } = req.params;
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // Obtener información de la entrega antes de eliminarla
    const [entrega] = await connection.query('SELECT * FROM entregas WHERE id = ?', [id]);
    
    if (!entrega || entrega.length === 0) {
      return res.status(404).json({ error: "Entrega no encontrada" });
    }
    
    await connection.query('DELETE FROM entregas WHERE id = ?', [id]);
    
    await registrarAuditoria(
      req.user.name,
      'eliminación',
      `Se eliminó la entrega ID ${id} (Producto: ${entrega[0].producto}, Cantidad: ${entrega[0].cantidad}, Destinatario: ${entrega[0].destinatario})`,
      'entregas',
      id
    );

    res.json({ 
      message: '✅ Entrega eliminada correctamente',
      deletedId: id
    });
  } catch (err) {
    console.error('Error eliminando entrega:', err);
    res.status(500).json({ error: "Error eliminando entrega" });
  } finally {
    if (connection) connection.release();
  }
});

// Rutas para cronogramas
app.get('/cronogramas', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query('SELECT * FROM cronogramas ORDER BY fecha_entrega ASC');
    res.json(results);
  } catch (err) {
    console.error('Error al obtener cronogramas:', err);
    res.status(500).json({ error: 'Error al obtener cronogramas' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/cronogramas', async (req, res) => {
  const { producto, cantidad, destinatario, fecha_entrega, frecuencia, descripcion } = req.body;
  let connection;
  
  // Validar datos requeridos
  if (!producto || !cantidad || !destinatario || !fecha_entrega || !frecuencia) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    connection = await pool.getConnection();
    const sql = `
      INSERT INTO cronogramas 
      (producto, cantidad, destinatario, fecha_entrega, frecuencia, descripcion) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      producto,
      parseInt(cantidad),
      destinatario,
      new Date(fecha_entrega),
      frecuencia,
      descripcion || ''
    ];

    const [result] = await connection.query(sql, values);
    
    await registrarAuditoria(
      req.user.name,
      'programación',
      `Se programó entrega de ${cantidad} unidades de ${producto} para ${dayjs(fecha_entrega).format('DD/MM/YYYY')}`,
      'cronogramas',
      result.insertId
    );

    res.status(201).json({
      message: 'Cronograma creado exitosamente',
      id: result.insertId
    });
  } catch (err) {
    console.error('Error al crear cronograma:', err);
    res.status(500).json({ error: 'Error al crear el cronograma' });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/cronogramas/:id', async (req, res) => {
  const { id } = req.params;
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // Obtener información del cronograma antes de eliminarlo
    const [cronograma] = await connection.query('SELECT * FROM cronogramas WHERE id = ?', [id]);
    
    if (!cronograma || cronograma.length === 0) {
      return res.status(404).json({ error: 'Cronograma no encontrado' });
    }
    
    await connection.query('DELETE FROM cronogramas WHERE id = ?', [id]);
    
    await registrarAuditoria(
      req.user.name,
      'eliminación',
      `Se eliminó el cronograma de entrega programada para ${dayjs(cronograma[0].fecha_entrega).format('DD/MM/YYYY')} (Producto: ${cronograma[0].producto}, Cantidad: ${cronograma[0].cantidad})`,
      'cronogramas',
      id
    );
    
    res.json({ message: 'Cronograma eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar cronograma:', err);
    res.status(500).json({ error: 'Error al eliminar el cronograma' });
  } finally {
    if (connection) connection.release();
  }
});

// Rutas para recordatorios
app.get('/recordatorios', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query('SELECT * FROM recordatorios ORDER BY fecha ASC');
    res.json(results);
  } catch (err) {
    console.error('Error al obtener recordatorios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/recordatorios', async (req, res) => {
  const { titulo, fecha, descripcion, producto_id } = req.body;
  let connection;
  
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO recordatorios (titulo, fecha, descripcion, producto_id) VALUES (?, ?, ?, ?)',
      [titulo, fecha, descripcion, producto_id]
    );
    
    await registrarAuditoria(
      req.user.name,
      'creación',
      `Se creó un nuevo recordatorio: ${titulo} para la fecha ${dayjs(fecha).format('DD/MM/YYYY')}`,
      'recordatorios',
      result.insertId
    );
    
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Error al crear recordatorio:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para eliminar recordatorios
app.delete('/recordatorios/:id', async (req, res) => {
  const { id } = req.params;
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // Obtener información del recordatorio antes de eliminarlo
    const [recordatorio] = await connection.query('SELECT * FROM recordatorios WHERE id = ?', [id]);
    
    if (!recordatorio || recordatorio.length === 0) {
      return res.status(404).json({ 
        error: 'Recordatorio no encontrado',
        message: `No se encontró un recordatorio con el ID ${id}`
      });
    }
    
    await connection.query('DELETE FROM recordatorios WHERE id = ?', [id]);
    
    await registrarAuditoria(
      req.user.name,
      'eliminación',
      `Se eliminó el recordatorio: ${recordatorio[0].titulo}`,
      'recordatorios',
      id
    );
    
    res.json({ 
      success: true,
      message: 'Recordatorio eliminado correctamente',
      id: id 
    });
  } catch (err) {
    console.error('Error al eliminar recordatorio:', err);
    res.status(500).json({ 
      error: 'Error al eliminar el recordatorio',
      details: err.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para obtener datos históricos
app.get('/productos/historico', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(`
      SELECT 
        DATE(fecha_ingreso) as fecha,
        AVG(cantidad) as stock_promedio,
        COUNT(CASE WHEN fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 1 MONTH) THEN 1 END) as productos_por_vencer,
        COUNT(*) as total_productos
      FROM productos
      WHERE fecha_ingreso IS NOT NULL
      GROUP BY DATE(fecha_ingreso)
      ORDER BY fecha_ingreso DESC
      LIMIT 30
    `);
    res.json(results);
  } catch (err) {
    console.error('Error al obtener histórico:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para obtener todos los reportes
app.get('/reportes', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [reportes] = await connection.query('SELECT * FROM reportes ORDER BY fecha DESC');
    res.json(reportes);
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener reportes: ' + error.message 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Función para formatear fecha
function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Endpoint para generar reportes
app.post('/reportes/generar', async (req, res) => {
  let connection;
  try {
    console.log('1. Iniciando generación de reporte');
    console.log('Datos recibidos:', req.body);
    
    const { tipo, fechaInicio, fechaFin, formato } = req.body;
    
    if (!tipo || !fechaInicio || !fechaFin || !formato) {
      throw new Error('Datos incompletos para generar el reporte');
    }

    console.log('2. Creando directorio de reportes');
    const reportesDir = path.join(__dirname, 'reportes');
    if (!fs.existsSync(reportesDir)) {
      console.log('Creando directorio:', reportesDir);
      fs.mkdirSync(reportesDir, { recursive: true });
    }

    console.log('3. Generando nombre de archivo');
    const timestamp = Date.now();
    const nombreArchivo = `reporte_${tipo}_${timestamp}.${formato}`;
    const filePath = path.join(reportesDir, nombreArchivo);
    console.log('Ruta del archivo:', filePath);

    console.log('4. Conectando a la base de datos');
    connection = await pool.getConnection();
    
    console.log('5. Consultando productos');
    const [productos] = await connection.query('SELECT * FROM productos');
    console.log(`Productos encontrados: ${productos.length}`);

    console.log('6. Generando PDF');
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        console.error('Error en stream:', error);
        reject(error);
      });

      stream.on('finish', async () => {
        try {
          console.log('7. Guardando registro en base de datos');
          await connection.query(
            'INSERT INTO reportes (nombre, tipo, fecha, formato, ruta_archivo) VALUES (?, ?, NOW(), ?, ?)',
            [nombreArchivo, tipo, formato, filePath]
          );

          console.log('8. Reporte generado exitosamente');
          res.json({
            success: true,
            mensaje: 'Reporte generado exitosamente',
            archivo: nombreArchivo
          });
          resolve();
        } catch (error) {
          console.error('Error al guardar en BD:', error);
          reject(error);
        }
      });

      doc.pipe(stream);

      doc.fontSize(20)
         .text('Reporte de Inventario', { align: 'center' });
      
      doc.moveDown()
         .fontSize(12)
         .text(`Fecha: ${new Date().toLocaleDateString()}`);
      
      doc.moveDown()
         .text(`Período: ${fechaInicio} al ${fechaFin}`);
      
      productos.forEach((producto) => {
        doc.text(`${producto.nombre} - Cantidad: ${producto.cantidad}`);
      });

      doc.end();
    });

    // Registrar la generación del reporte en auditoría
    await registrarAuditoria(
      req.user.name,
      'descarga',
      `Se generó un reporte de ${tipo} en formato ${formato} para el período ${fechaInicio} - ${fechaFin}`,
      'reportes',
      null
    );

  } catch (error) {
    console.error('Error detallado:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
      console.log('Conexión liberada');
    }
  }
});

// Endpoint para descargar reportes
app.get('/reportes/:nombre', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'reportes', req.params.nombre);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }
  } catch (error) {
    console.error('Error al descargar:', error);
    res.status(500).json({
      success: false,
      error: 'Error al descargar el archivo'
    });
  }
});

// Función para generar PDF
async function generarPDF(datos, tipo, nombreArchivo) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const filePath = path.join(reportesDir, `${nombreArchivo}.pdf`);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Título
      doc.fontSize(20).text(`Reporte de ${tipo.toUpperCase()}`, {
        align: 'center'
      });
      doc.moveDown();

      // Fecha del reporte
      doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}`, {
        align: 'right'
      });
      doc.moveDown();

      // Contenido según tipo
      datos.forEach((item, index) => {
        let texto = '';
        switch (tipo) {
          case 'inventario':
            texto = `${index + 1}. ${item.nombre}\n   Cantidad: ${item.cantidad}\n   Categoría: ${item.categoria_nombre}`;
            break;
          case 'movimientos':
            texto = `${index + 1}. ${item.producto_nombre}\n   Tipo: ${item.tipo}\n   Cantidad: ${item.cantidad}\n   Fecha: ${new Date(item.fecha).toLocaleDateString()}`;
            break;
          case 'vencimientos':
            texto = `${index + 1}. ${item.nombre}\n   Vence: ${new Date(item.fecha_vencimiento).toLocaleDateString()}\n   Categoría: ${item.categoria_nombre}`;
            break;
        }
        doc.fontSize(12).text(texto);
        doc.moveDown();
      });

      doc.end();

      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Función para generar Excel
async function generarExcel(datos, tipo, nombreArchivo) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(tipo);

    // Definir columnas según tipo
    switch (tipo) {
      case 'inventario':
        worksheet.columns = [
          { header: 'Nombre', key: 'nombre' },
          { header: 'Cantidad', key: 'cantidad' },
          { header: 'Categoría', key: 'categoria_nombre' },
          { header: 'Fecha Ingreso', key: 'fecha_ingreso' }
        ];
        break;
      case 'movimientos':
        worksheet.columns = [
          { header: 'Producto', key: 'producto_nombre' },
          { header: 'Tipo', key: 'tipo' },
          { header: 'Cantidad', key: 'cantidad' },
          { header: 'Fecha', key: 'fecha' }
        ];
        break;
      case 'vencimientos':
        worksheet.columns = [
          { header: 'Nombre', key: 'nombre' },
          { header: 'Categoría', key: 'categoria_nombre' },
          { header: 'Fecha Vencimiento', key: 'fecha_vencimiento' }
        ];
        break;
    }

    // Agregar datos
    worksheet.addRows(datos);

    const filePath = path.join(reportesDir, `${nombreArchivo}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  } catch (error) {
    throw error;
  }
}

// Ruta para obtener productos con stock bajo
app.get('/productos/stock-bajo', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query('SELECT * FROM productos WHERE cantidad < 10');
    res.json(results);
  } catch (err) {
    console.error('Error obteniendo productos con stock bajo:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para obtener productos por vencer
app.get('/productos/por-vencer', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(`
      SELECT * FROM productos 
      WHERE fecha_vencimiento IS NOT NULL 
      AND fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY fecha_vencimiento ASC
    `);
    res.json(results);
  } catch (err) {
    console.error('Error obteniendo productos por vencer:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para obtener histórico de productos
app.get('/productos/historico', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(`
      SELECT 
        p.*,
        COALESCE(e.total_entregado, 0) as cantidad_entregada,
        DATE_FORMAT(p.fecha_ingreso, '%Y-%m-%d') as fecha
      FROM productos p
      LEFT JOIN (
        SELECT producto_id, SUM(cantidad) as total_entregado
        FROM entregas
        GROUP BY producto_id
      ) e ON p.id = e.producto_id
      ORDER BY p.fecha_ingreso DESC
    `);
    res.json(results);
  } catch (err) {
    console.error('Error obteniendo histórico de productos:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para registrar auditoría
app.post('/auditorias', async (req, res) => {
  console.log('Headers recibidos:', req.headers);
  console.log('Body recibido:', req.body);
  
  try {
    const datos = {
      ...req.body,
      usuario_nombre: req.body.usuario_nombre || req.headers['user-name'] || 'Sistema'
    };

    const id = await registrarAuditoria(datos);
    
    res.status(201).json({
      success: true,
      message: 'Auditoría registrada exitosamente',
      id: id
    });
  } catch (err) {
    console.error('Error al registrar auditoría:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al registrar auditoría',
      details: err.message 
    });
  }
});

// Ruta para obtener registros de auditoría
app.get('/auditorias', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    let query = 'SELECT * FROM auditoria';
    const params = [];
    
    // Aplicar filtros si existen
    if (Object.keys(req.query).length > 0) {
      const where = [];
      
      if (req.query.usuario) {
        where.push('usuario_nombre LIKE ?');
        params.push(`%${req.query.usuario}%`);
      }
      
      if (req.query.accion) {
        where.push('accion = ?');
        params.push(req.query.accion);
      }
      
      if (req.query.fecha_inicio) {
        where.push('fecha_hora >= ?');
        params.push(req.query.fecha_inicio);
      }
      
      if (req.query.fecha_fin) {
        where.push('fecha_hora <= ?');
        params.push(req.query.fecha_fin);
      }
      
      if (where.length > 0) {
        query += ' WHERE ' + where.join(' AND ');
      }
    }
    
    query += ' ORDER BY fecha_hora DESC';
    
    const [registros] = await connection.query(query, params);
    
    // Formatear los detalles JSON
    const registrosFormateados = registros.map(registro => ({
      ...registro,
      detalles: JSON.parse(registro.detalles)
    }));
    
    res.json(registrosFormateados);
  } catch (err) {
    console.error('Error al obtener registros de auditoría:', err);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener registros de auditoría',
      details: err.message 
    });
  } finally {
    if (connection) connection.release();
  }
});

// Agregar manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Verificar que el servidor está escuchando
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log('CORS configurado para aceptar solicitudes de cualquier origen');
});

// Manejar errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('Error no manejado:', err);
});