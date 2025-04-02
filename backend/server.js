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
    'X-User-Role',
    'X-User-Email'
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

// Middleware de autenticación
app.use((req, res, next) => {
  // Obtenemos datos del usuario del header si existen
  const userName = req.headers['x-user-name'];
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  
  // Si hay datos en los headers, los asignamos al objeto req.user
  if (userName && userId) {
    req.user = {
      id: userId,
      name: userName,
      rol: userRole || 'usuario'
    };
  } else {
    // Si no hay datos, creamos un objeto de usuario genérico
    req.user = {
      name: 'Sistema',
      id: null,
      rol: 'sistema'
    };
    console.log('⚠️ Petición sin nombre de usuario');
  }
  
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
    
    // Crear tabla de unidades
    await connection.query(`
      CREATE TABLE IF NOT EXISTS unidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla de unidades verificada/creada correctamente');

    // Crear tabla de bodegas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bodegas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        unidad_id INT NOT NULL,
        descripcion TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unidad_id) REFERENCES unidades(id)
      )
    `);
    console.log('Tabla de bodegas verificada/creada correctamente');

    // Modificar tabla de productos para incluir bodega_id
    await connection.query(`
      ALTER TABLE productos 
      ADD COLUMN IF NOT EXISTS bodega_id INT,
      ADD FOREIGN KEY IF NOT EXISTS (bodega_id) REFERENCES bodegas(id)
    `);
    console.log('Tabla de productos modificada correctamente');

    // Modificar tabla de usuarios para incluir unidad_id y rol
    await connection.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS unidad_id INT,
      ADD COLUMN IF NOT EXISTS rol ENUM('admin', 'usuario') DEFAULT 'usuario',
      ADD FOREIGN KEY IF NOT EXISTS (unidad_id) REFERENCES unidades(id)
    `);
    console.log('Tabla de usuarios modificada correctamente');

    // Crear tabla de auditoría si no existe
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        usuario_nombre VARCHAR(255) NOT NULL,
        accion VARCHAR(255) NOT NULL,
        detalles TEXT,
        tabla_afectada VARCHAR(255),
        registro_id INT,
        fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla de auditoría verificada/creada correctamente');

    // Crear tabla de reportes si no existe
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reportes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        formato VARCHAR(20) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ruta_archivo TEXT NOT NULL
      )
    `);
    console.log('Tabla de reportes verificada/creada correctamente');

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

// Rutas de autenticación
app.post('/api/auth/login', async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
    }
    
    connection = await pool.getConnection();
    const [users] = await connection.query(
      `SELECT u.*, uni.nombre as unidad_nombre 
       FROM usuarios u 
       LEFT JOIN unidades uni ON u.unidad_id = uni.id 
       WHERE u.email = ?`, 
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    const user = users[0];
    
    // En un entorno real, compararíamos con un hash, pero para este ejemplo
    // hacemos una comparación directa
    if (password !== user.password) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Registramos el login en auditoría
    await registrarAuditoria({
      usuario_id: user.id,
      usuario_nombre: user.nombre,
      accion: 'inicio_sesion',
      detalles: 'Inicio de sesión exitoso'
    });
    
    // Creamos un token JWT (simulado para este ejemplo)
    const token = 'jwt-token-simulado-' + Date.now();
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.nombre,
        email: user.email,
        role: user.rol,
        unidad_id: user.unidad_id,
        unidad_nombre: user.unidad_nombre
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/auth/me', async (req, res) => {
  let connection;
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    
    connection = await pool.getConnection();
    const [users] = await connection.query(
      `SELECT u.*, uni.nombre as unidad_nombre 
       FROM usuarios u 
       LEFT JOIN unidades uni ON u.unidad_id = uni.id 
       WHERE u.id = ?`, 
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const user = users[0];
    
    res.json({
      id: user.id,
      name: user.nombre,
      email: user.email,
      role: user.rol,
      unidad_id: user.unidad_id,
      unidad_nombre: user.unidad_nombre
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta de prueba
app.get('/test', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

// Ruta GET productos simplificada
app.get('/productos', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Mostrar todos los productos sin filtros
    const query = 'SELECT * FROM productos';
    
    const [results] = await connection.query(query);
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

// Endpoint para descargar reportes específicos por ID
app.get('/reportes/:id/download', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [reporte] = await connection.query('SELECT * FROM reportes WHERE id = ?', [req.params.id]);
    
    if (!reporte || reporte.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reporte no encontrado'
      });
    }
    
    const reporteInfo = reporte[0];
    const filePath = path.join(__dirname, 'reportes', reporteInfo.nombre);
    
    if (fs.existsSync(filePath)) {
      // Establecer el tipo de contenido adecuado para la descarga
      const contentType = reporteInfo.formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${reporteInfo.nombre}"`);
      
      // Registrar la descarga en auditoría
      await registrarAuditoria(
        req.user ? req.user.name : 'Sistema',
        'descarga',
        `Se descargó el reporte ${reporteInfo.nombre}`,
        'reportes',
        reporteInfo.id
      );
      
      // Enviar el archivo
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }
  } catch (error) {
    console.error('Error al descargar reporte:', error);
    res.status(500).json({
      success: false,
      error: 'Error al descargar el reporte'
    });
  } finally {
    if (connection) connection.release();
  }
});

// Mejorar el endpoint existente para descargar por nombre
app.get('/reportes/:nombre', (req, res) => {
  try {
    const reportesDir = path.join(__dirname, 'reportes');
    const filePath = path.join(reportesDir, req.params.nombre);
    
    if (fs.existsSync(filePath)) {
      // Determinar el tipo de contenido basado en la extensión
      const extension = path.extname(req.params.nombre).toLowerCase();
      const contentType = extension === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.nombre}"`);
      
      // Enviar el archivo como descarga
      fs.createReadStream(filePath).pipe(res);
    } else {
      console.error(`Archivo no encontrado: ${filePath}`);
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

      doc.pipe(stream);

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

// Endpoint para reportes de movimientos
app.post('/reportes/movimientos', async (req, res) => {
  let connection;
  try {
    const { fechaInicio, fechaFin, formato, filtros } = req.body;
    const usuario = {
      nombre: req.headers['x-user-name'] || 'Usuario del Sistema',
      rol: req.headers['x-user-role'] || 'Usuario'
    };
    
    if (!fechaInicio || !fechaFin || !formato) {
      throw new Error('Datos incompletos para generar el reporte');
    }

    // Crear directorio de reportes si no existe
    const reportesDir = path.join(__dirname, 'reportes');
    if (!fs.existsSync(reportesDir)) {
      fs.mkdirSync(reportesDir, { recursive: true });
    }

    // Generar nombre de archivo
    const timestamp = Date.now();
    const nombreArchivo = `reporte_movimientos_${timestamp}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
    const filePath = path.join(reportesDir, nombreArchivo);

    // Obtener datos de auditoría
    connection = await pool.getConnection();
    
    let query = `
      SELECT 
        id,
        usuario_nombre,
        accion,
        fecha_hora,
        detalles,
        tabla_afectada,
        registro_id
      FROM auditoria
      WHERE 1=1
    `;
    
    let params = [];
    
    if (fechaInicio && fechaFin) {
      query += ' AND DATE(fecha_hora) BETWEEN DATE(?) AND DATE(?)';
      params.push(fechaInicio, fechaFin);
    }
    
    if (filtros && filtros.estado && filtros.estado !== 'todos') {
      query += ' AND accion = ?';
      params.push(filtros.estado);
    }
    
    query += ' ORDER BY fecha_hora DESC LIMIT 500';
    
    const [movimientos] = await connection.query(query, params);

    if (formato === 'pdf') {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Usar la nueva función para generar el reporte
      await generarReporteProfesional(
        doc,
        'Registro de Movimientos',
        async (doc) => {
          // Contenido específico del reporte de movimientos
          movimientos.forEach((mov, index) => {
            if (doc.y > doc.page.height - 150) {
              doc.addPage();
            }

            const accion = mov.accion ? mov.accion.toUpperCase() : 'ACCIÓN NO ESPECIFICADA';
            const fecha = mov.fecha_hora ? dayjs(mov.fecha_hora).format('DD/MM/YYYY HH:mm') : 'Fecha no disponible';

            doc.fontSize(12)
               .fillColor('#1976D2')
               .text(`${index + 1}. ${accion}`, { continued: true })
               .fillColor('#757575')
               .text(`  (${fecha})`);

            doc.fontSize(10)
               .fillColor('#000000')
               .text(`Usuario: ${mov.usuario_nombre || 'No especificado'}`)
               .text(`Tabla afectada: ${mov.tabla_afectada || 'N/A'}`);

            // Agregar detalles si existen
            let detalles;
            try {
              detalles = typeof mov.detalles === 'string' ? JSON.parse(mov.detalles) : mov.detalles;
              if (detalles && Object.keys(detalles).length > 0) {
                doc.text('Detalles:', { underline: true });
                Object.entries(detalles).forEach(([key, value]) => {
                  doc.text(`  ${key}: ${JSON.stringify(value)}`);
                });
              }
            } catch (e) {
              doc.text('Detalles: No disponibles');
            }

            doc.moveDown();
          });
        },
        usuario,
        { fechaInicio, fechaFin }
      );

      doc.end();

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    }

    // ... existing code for Excel format ...

  } catch (error) {
    console.error('Error al generar reporte de movimientos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/reportes/cronograma', async (req, res) => {
  let connection;
  try {
    const { fechaInicio, fechaFin, formato, filtros } = req.body;
    const usuario = {
      nombre: req.headers['x-user-name'] || 'Usuario del Sistema',
      rol: req.headers['x-user-role'] || 'Usuario'
    };
    
    if (!fechaInicio || !fechaFin || !formato) {
      throw new Error('Datos incompletos para generar el reporte');
    }

    // Crear directorio de reportes si no existe
    const reportesDir = path.join(__dirname, 'reportes');
    if (!fs.existsSync(reportesDir)) {
      fs.mkdirSync(reportesDir, { recursive: true });
    }

    // Generar nombre de archivo
    const timestamp = Date.now();
    const nombreArchivo = `reporte_cronograma_${timestamp}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
    const filePath = path.join(reportesDir, nombreArchivo);

    // Obtener datos de cronograma
    connection = await pool.getConnection();
    
    let query = `
      SELECT * FROM cronogramas
      WHERE fecha_entrega BETWEEN ? AND ?
    `;
    
    const params = [fechaInicio, fechaFin];
    
    // Aplicar filtros adicionales
    if (filtros) {
      if (filtros.frecuencia && filtros.frecuencia !== 'todas') {
        query += ' AND frecuencia = ?';
        params.push(filtros.frecuencia);
      }
      
      if (filtros.destinatario && filtros.destinatario !== 'todos') {
        query += ' AND destinatario = ?';
        params.push(filtros.destinatario);
      }
    }
    
    query += ' ORDER BY fecha_entrega ASC';
    
    const [cronogramas] = await connection.query(query, params);
    
    if (formato === 'pdf') {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Usar la nueva función para generar el reporte
      await generarReporteProfesional(
        doc,
        'Cronograma de Entregas',
        async (doc) => {
          // Agregar estadísticas generales
          const totalEntregas = cronogramas.length;
          const entregasHoy = cronogramas.filter(c => dayjs(c.fecha_entrega).isSame(dayjs(), 'day')).length;
          const entregasPendientes = cronogramas.filter(c => dayjs(c.fecha_entrega).isAfter(dayjs(), 'day')).length;
          
          doc.fontSize(12)
             .fillColor('#1976D2')
             .text('Resumen', { underline: true })
             .moveDown(0.5)
             .fillColor('#000000')
             .text(`Total de entregas programadas: ${totalEntregas}`)
             .text(`Entregas para hoy: ${entregasHoy}`)
             .text(`Entregas pendientes: ${entregasPendientes}`)
             .moveDown();

          // Agrupar entregas por mes
          const entregasPorMes = {};
          cronogramas.forEach(entrega => {
            const mes = dayjs(entrega.fecha_entrega).format('MMMM YYYY');
            if (!entregasPorMes[mes]) {
              entregasPorMes[mes] = [];
            }
            entregasPorMes[mes].push(entrega);
          });

          // Mostrar entregas agrupadas por mes
          Object.entries(entregasPorMes).forEach(([mes, entregas]) => {
            if (doc.y > doc.page.height - 150) {
              doc.addPage();
            }

            doc.fontSize(14)
               .fillColor('#1976D2')
               .text(mes.toUpperCase())
               .moveDown(0.5);

            entregas.forEach((item, index) => {
              const esFechaHoy = dayjs(item.fecha_entrega).isSame(dayjs(), 'day');
              const colorFecha = esFechaHoy ? '#D32F2F' : '#000000';
              
              doc.fontSize(12)
                 .fillColor('#1976D2')
                 .text(`${index + 1}. ${item.producto}`, { continued: true })
                 .fillColor(colorFecha)
                 .text(`  (${dayjs(item.fecha_entrega).format('DD/MM/YYYY')})`, { align: 'right' });

              doc.fontSize(10)
                 .fillColor('#000000')
                 .text(`Cantidad: ${item.cantidad}`)
                 .text(`Destinatario: ${item.destinatario}`)
                 .text(`Frecuencia: ${item.frecuencia}`);

              if (item.descripcion) {
                doc.text(`Descripción: ${item.descripcion}`);
              }

              // Agregar línea separadora
              if (index < entregas.length - 1) {
                doc.moveDown(0.5)
                   .moveTo(50, doc.y)
                   .lineTo(doc.page.width - 50, doc.y)
                   .stroke('#E0E0E0')
                   .moveDown(0.5);
              }
            });

            doc.moveDown();
          });
        },
        usuario,
        { fechaInicio, fechaFin }
      );

      doc.end();

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    } else {
      // Código existente para Excel...
    }

    // Registrar en base de datos y auditoría
    await connection.query(
      'INSERT INTO reportes (nombre, tipo, fecha, formato, ruta_archivo) VALUES (?, ?, NOW(), ?, ?)',
      [nombreArchivo, 'cronograma', formato, filePath]
    );
    
    await registrarAuditoria(
      usuario.nombre,
      'generación',
      `Se generó un reporte de cronograma en formato ${formato} para el período ${fechaInicio} - ${fechaFin}`,
      'reportes',
      null
    );
    
    res.json({
      success: true,
      mensaje: 'Reporte de cronograma generado exitosamente',
      archivo: nombreArchivo
    });
    
  } catch (error) {
    console.error('Error al generar reporte de cronograma:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/reportes/vencimientos', async (req, res) => {
  let connection;
  try {
    const { fechaInicio, fechaFin, formato, filtros } = req.body;
    const usuario = {
      nombre: req.headers['x-user-name'] || 'Usuario del Sistema',
      rol: req.headers['x-user-role'] || 'Usuario'
    };
    
    if (!formato) {
      throw new Error('Datos incompletos para generar el reporte');
    }

    // Crear directorio de reportes si no existe
    const reportesDir = path.join(__dirname, 'reportes');
    if (!fs.existsSync(reportesDir)) {
      fs.mkdirSync(reportesDir, { recursive: true });
    }

    // Generar nombre de archivo
    const timestamp = Date.now();
    const nombreArchivo = `reporte_vencimientos_${timestamp}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
    const filePath = path.join(reportesDir, nombreArchivo);

    // Obtener datos de productos por vencer
    connection = await pool.getConnection();
    
    let query = `
      SELECT * FROM productos 
      WHERE fecha_vencimiento IS NOT NULL
    `;
    
    const params = [];
    
    // Aplicar filtros adicionales
    if (filtros && filtros.estado) {
      const fechaHoy = dayjs().format('YYYY-MM-DD');
      if (filtros.estado === 'proximo') {
        query += ' AND fecha_vencimiento BETWEEN ? AND DATE_ADD(?, INTERVAL 30 DAY)';
        params.push(fechaHoy, fechaHoy);
      } else if (filtros.estado === 'vencido') {
        query += ' AND fecha_vencimiento < ?';
        params.push(fechaHoy);
      }
    }
    
    query += ' ORDER BY fecha_vencimiento ASC';
    
    const [productos] = await connection.query(query, params);
    
    if (formato === 'pdf') {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Usar la nueva función para generar el reporte
      await generarReporteProfesional(
        doc,
        'Reporte de Vencimientos',
        async (doc) => {
          // Agregar estadísticas generales
          const totalProductos = productos.length;
          const vencidos = productos.filter(p => dayjs(p.fecha_vencimiento).isBefore(dayjs(), 'day')).length;
          const porVencer = productos.filter(p => {
            const dias = dayjs(p.fecha_vencimiento).diff(dayjs(), 'day');
            return dias >= 0 && dias <= 30;
          }).length;
          
          doc.fontSize(12)
             .fillColor('#1976D2')
             .text('Resumen', { underline: true })
             .moveDown(0.5)
             .fillColor('#000000')
             .text(`Total de productos: ${totalProductos}`)
             .text(`Productos vencidos: ${vencidos}`)
             .text(`Productos por vencer en 30 días: ${porVencer}`)
             .moveDown();

          // Tabla de productos
          productos.forEach((item, index) => {
            if (doc.y > doc.page.height - 150) {
              doc.addPage();
            }

            const diasRestantes = dayjs(item.fecha_vencimiento).diff(dayjs(), 'day');
            let estado = '';
            let colorEstado = '#000000';
            
            if (diasRestantes < 0) {
              estado = 'CADUCADO';
              colorEstado = '#D32F2F';
            } else if (diasRestantes === 0) {
              estado = 'VENCE HOY';
              colorEstado = '#FFA000';
            } else if (diasRestantes <= 30) {
              estado = `Vence en ${diasRestantes} días`;
              colorEstado = '#FFA000';
            } else {
              estado = 'Vigente';
              colorEstado = '#388E3C';
            }
            
            doc.fontSize(12)
               .fillColor('#1976D2')
               .text(`${index + 1}. ${item.nombre}`, { continued: true })
               .fillColor(colorEstado)
               .text(`  (${estado})`, { align: 'right' });

            doc.fontSize(10)
               .fillColor('#000000')
               .text(`Categoría: ${item.categoria || 'No especificada'}`)
               .text(`Cantidad: ${item.cantidad}`)
               .text(`Fecha de vencimiento: ${dayjs(item.fecha_vencimiento).format('DD/MM/YYYY')}`);

            // Agregar línea separadora
            if (index < productos.length - 1) {
              doc.moveDown(0.5)
                 .moveTo(50, doc.y)
                 .lineTo(doc.page.width - 50, doc.y)
                 .stroke('#E0E0E0')
                 .moveDown(0.5);
            }
          });
        },
        usuario,
        { fechaInicio, fechaFin }
      );

      doc.end();

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    } else {
      // Código existente para Excel...
    }

    // Registrar en base de datos y auditoría...
    await connection.query(
      'INSERT INTO reportes (nombre, tipo, fecha, formato, ruta_archivo) VALUES (?, ?, NOW(), ?, ?)',
      [nombreArchivo, 'vencimientos', formato, filePath]
    );
    
    await registrarAuditoria(
      usuario.nombre,
      'generación',
      `Se generó un reporte de vencimientos en formato ${formato}`,
      'reportes',
      null
    );
    
    res.json({
      success: true,
      mensaje: 'Reporte de vencimientos generado exitosamente',
      archivo: nombreArchivo
    });
    
  } catch (error) {
    console.error('Error al generar reporte de vencimientos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/reportes/historico', async (req, res) => {
  let connection;
  try {
    const { fechaInicio, fechaFin, formato } = req.body;
    const usuario = {
      nombre: req.headers['x-user-name'] || 'Usuario del Sistema',
      rol: req.headers['x-user-role'] || 'Usuario'
    };
    
    if (!fechaInicio || !fechaFin || !formato) {
      throw new Error('Datos incompletos para generar el reporte');
    }

    // Crear directorio de reportes si no existe
    const reportesDir = path.join(__dirname, 'reportes');
    if (!fs.existsSync(reportesDir)) {
      fs.mkdirSync(reportesDir, { recursive: true });
    }

    // Generar nombre de archivo
    const timestamp = Date.now();
    const nombreArchivo = `reporte_historico_${timestamp}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
    const filePath = path.join(reportesDir, nombreArchivo);

    // Obtener datos históricos de productos
    connection = await pool.getConnection();
    
    const query = `
      SELECT p.id, p.nombre, p.categoria, 
             (SELECT SUM(cantidad) FROM entregas WHERE producto_id = p.id AND fecha BETWEEN ? AND ?) as salidas,
             (SELECT MAX(cantidad) FROM productos_historico WHERE producto_id = p.id AND fecha BETWEEN ? AND ?) as maximo,
             (SELECT MIN(cantidad) FROM productos_historico WHERE producto_id = p.id AND fecha BETWEEN ? AND ?) as minimo,
             p.cantidad as actual
      FROM productos p
      ORDER BY p.nombre
    `;
    
    const [productos] = await connection.query(query, [fechaInicio, fechaFin, fechaInicio, fechaFin, fechaInicio, fechaFin]);
    
    if (formato === 'pdf') {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Usar la nueva función para generar el reporte
      await generarReporteProfesional(
        doc,
        'Reporte Histórico de Stock',
        async (doc) => {
          // Agregar estadísticas generales
          const totalProductos = productos.length;
          const productosSinStock = productos.filter(p => p.actual === 0).length;
          const productosConMovimiento = productos.filter(p => p.salidas > 0).length;
          
          doc.fontSize(12)
             .fillColor('#1976D2')
             .text('Resumen', { underline: true })
             .moveDown(0.5)
             .fillColor('#000000')
             .text(`Total de productos: ${totalProductos}`)
             .text(`Productos sin stock: ${productosSinStock}`)
             .text(`Productos con movimientos: ${productosConMovimiento}`)
             .moveDown();

          // Agrupar productos por categoría
          const productosPorCategoria = {};
          productos.forEach(producto => {
            const categoria = producto.categoria || 'Sin categoría';
            if (!productosPorCategoria[categoria]) {
              productosPorCategoria[categoria] = [];
            }
            productosPorCategoria[categoria].push(producto);
          });

          // Mostrar productos agrupados por categoría
          Object.entries(productosPorCategoria).forEach(([categoria, productos]) => {
            if (doc.y > doc.page.height - 150) {
              doc.addPage();
            }

            doc.fontSize(14)
               .fillColor('#1976D2')
               .text(categoria.toUpperCase())
               .moveDown(0.5);

            productos.forEach((item, index) => {
              const stockBajo = item.actual < (item.minimo || 0);
              const colorStock = stockBajo ? '#D32F2F' : '#000000';
              
              doc.fontSize(12)
                 .fillColor('#1976D2')
                 .text(`${index + 1}. ${item.nombre}`, { continued: true })
                 .fillColor(colorStock)
                 .text(`  (Stock: ${item.actual})`, { align: 'right' });

              doc.fontSize(10)
                 .fillColor('#000000')
                 .text(`Stock máximo registrado: ${item.maximo || 'N/A'}`)
                 .text(`Stock mínimo registrado: ${item.minimo || 'N/A'}`)
                 .text(`Total de salidas: ${item.salidas || 0}`);

              // Agregar línea separadora
              if (index < productos.length - 1) {
                doc.moveDown(0.5)
                   .moveTo(50, doc.y)
                   .lineTo(doc.page.width - 50, doc.y)
                   .stroke('#E0E0E0')
                   .moveDown(0.5);
              }
            });

            doc.moveDown();
          });
        },
        usuario,
        { fechaInicio, fechaFin }
      );

      doc.end();

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    } else {
      // Código existente para Excel...
    }

    // Registrar en base de datos y auditoría
    await connection.query(
      'INSERT INTO reportes (nombre, tipo, fecha, formato, ruta_archivo) VALUES (?, ?, NOW(), ?, ?)',
      [nombreArchivo, 'historico', formato, filePath]
    );
    
    await registrarAuditoria(
      usuario.nombre,
      'generación',
      `Se generó un reporte histórico en formato ${formato} para el período ${fechaInicio} - ${fechaFin}`,
      'reportes',
      null
    );
    
    res.json({
      success: true,
      mensaje: 'Reporte histórico generado exitosamente',
      archivo: nombreArchivo
    });
    
  } catch (error) {
    console.error('Error al generar reporte histórico:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

// Función para generar reportes PDF profesionales
async function generarReporteProfesional(doc, titulo, datos, usuario, filtros = {}) {
  // Configuración de colores y estilos
  const colorPrimario = '#2196F3';
  const colorSecundario = '#757575';
  const colorFondo = '#F5F5F5';

  // Encabezado con logo y título
  doc.rect(0, 0, doc.page.width, 100).fill(colorFondo);
  
  // Título principal
  doc.fontSize(24)
     .fillColor(colorPrimario)
     .text(titulo.toUpperCase(), 50, 50, { align: 'center' });
  
  // Información del reporte
  doc.moveDown()
     .fontSize(12)
     .fillColor(colorSecundario);

  // Agregar fecha y hora de generación
  const fechaGeneracion = dayjs().format('DD/MM/YYYY HH:mm:ss');
  doc.text(`Fecha de generación: ${fechaGeneracion}`, 50, 120);

  // Agregar filtros si existen
  if (filtros.fechaInicio && filtros.fechaFin) {
    doc.moveDown()
       .text(`Período: ${dayjs(filtros.fechaInicio).format('DD/MM/YYYY')} al ${dayjs(filtros.fechaFin).format('DD/MM/YYYY')}`);
  }

  // Línea separadora
  doc.moveDown()
     .moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke(colorPrimario);

  // Contenido principal
  doc.moveDown()
     .fillColor('#000000');

  // Agregar contenido específico del reporte
  if (typeof datos === 'function') {
    await datos(doc);
  }

  // Pie de página con firma
  const altoPiePagina = 100;
  doc.rect(0, doc.page.height - altoPiePagina, doc.page.width, altoPiePagina)
     .fill(colorFondo);

  // Línea de firma
  const xFirma = doc.page.width - 200;
  const yFirma = doc.page.height - 60;
  
  doc.moveTo(xFirma, yFirma)
     .lineTo(doc.page.width - 50, yFirma)
     .stroke(colorSecundario);

  // Información del usuario
  doc.fontSize(10)
     .fillColor(colorSecundario)
     .text(usuario.nombre || 'Usuario del Sistema', xFirma, yFirma + 5)
     .fontSize(8)
     .text(usuario.rol || 'Rol no especificado', xFirma, yFirma + 20);

  // Número de página
  doc.fontSize(10)
     .text(
       `Página ${doc.pageNumber}`,
       50,
       doc.page.height - 50,
       { align: 'left' }
     );
}

// Rutas para unidades (solo accesibles por administradores)
app.get('/api/unidades', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [unidades] = await connection.query('SELECT * FROM unidades ORDER BY nombre');
    res.json(unidades);
  } catch (err) {
    console.error('Error al obtener unidades:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para crear una nueva unidad (solo admin)
app.post('/unidades', async (req, res) => {
  const { nombre, descripcion } = req.body;
  let connection;
  
  try {
    // Validar que el nombre esté presente
    if (!nombre) {
      return res.status(400).json({ message: 'El nombre de la unidad es requerido' });
    }
    
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO unidades (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );
    
    await registrarAuditoria({
      usuario_nombre: req.headers['x-user-name'] || 'Gestor de usuarios',
      usuario_id: req.headers['x-user-id'] || null,
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

// Ruta para obtener bodegas de una unidad
app.get('/unidades/:unidadId/bodegas', async (req, res) => {
  const { unidadId } = req.params;
  let connection;
  
  try {
    connection = await pool.getConnection();
    const [bodegas] = await connection.query(
      'SELECT * FROM bodegas WHERE unidad_id = ? ORDER BY nombre',
      [unidadId]
    );
    res.json(bodegas);
  } catch (err) {
    console.error('Error al obtener bodegas:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para crear una nueva bodega
app.post('/bodegas', async (req, res) => {
  const { nombre, unidad_id, descripcion } = req.body;
  let connection;
  
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO bodegas (nombre, unidad_id, descripcion) VALUES (?, ?, ?)',
      [nombre, unidad_id, descripcion]
    );
    
    await registrarAuditoria({
      usuario_nombre: req.user.name,
      accion: 'creación',
      detalles: `Se creó la bodega ${nombre} en la unidad ${unidad_id}`,
      tabla_afectada: 'bodegas',
      registro_id: result.insertId
    });

    res.status(201).json({
      message: 'Bodega creada exitosamente',
      id: result.insertId
    });
  } catch (err) {
    console.error('Error al crear bodega:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Middleware para verificar rol de administrador
const verificarAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
};

// Rutas para unidades (solo accesibles por administradores)
app.get('/api/unidades', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [unidades] = await connection.query('SELECT * FROM unidades ORDER BY nombre');
    res.json(unidades);
  } catch (err) {
    console.error('Error al obtener unidades:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/unidades', verificarAdmin, async (req, res) => {
  const { codigo, nombre, descripcion } = req.body;
  let connection;
  
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO unidades (codigo, nombre, descripcion) VALUES (?, ?, ?)',
      [codigo, nombre, descripcion]
    );
    
    await registrarAuditoria({
      usuario_nombre: req.user.name,
      accion: 'creación',
      detalles: `Se creó la unidad ${nombre}`,
      tabla_afectada: 'unidades',
      registro_id: result.insertId
    });

    res.status(201).json({
      message: 'Unidad creada exitosamente',
      id: result.insertId
    });
  } catch (err) {
    console.error('Error al crear unidad:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Rutas para bodegas
app.get('/api/bodegas', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [bodegas] = await connection.query(`
      SELECT b.*, u.nombre as nombre_unidad 
      FROM bodegas b 
      JOIN unidades u ON b.unidad_id = u.id 
      ${req.user.role !== 'admin' ? 'WHERE b.unidad_id = ?' : ''}
      ORDER BY b.nombre
    `, req.user.role !== 'admin' ? [req.user.unidad_id] : []);
    res.json(bodegas);
  } catch (err) {
    console.error('Error al obtener bodegas:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/bodegas', verificarAdmin, async (req, res) => {
  const { nombre, unidad_id, descripcion } = req.body;
  let connection;
  
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO bodegas (nombre, unidad_id, descripcion) VALUES (?, ?, ?)',
      [nombre, unidad_id, descripcion]
    );
    
    await registrarAuditoria({
      usuario_nombre: req.user.name,
      accion: 'creación',
      detalles: `Se creó la bodega ${nombre} en la unidad ${unidad_id}`,
      tabla_afectada: 'bodegas',
      registro_id: result.insertId
    });

    res.status(201).json({
      message: 'Bodega creada exitosamente',
      id: result.insertId
    });
  } catch (err) {
    console.error('Error al crear bodega:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para obtener bodegas de una unidad específica
app.get('/api/unidades/:unidadId/bodegas', async (req, res) => {
  const { unidadId } = req.params;
  let connection;
  
  try {
    connection = await pool.getConnection();
    // Verificar si el usuario tiene acceso a esta unidad
    if (req.user.role !== 'admin' && req.user.unidad_id !== parseInt(unidadId)) {
      return res.status(403).json({ error: 'No tienes acceso a esta unidad' });
    }

    const [bodegas] = await connection.query(
      'SELECT * FROM bodegas WHERE unidad_id = ? ORDER BY nombre',
      [unidadId]
    );
    res.json(bodegas);
  } catch (err) {
    console.error('Error al obtener bodegas:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Rutas de autenticación
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  let connection;

  try {
    connection = await pool.getConnection();
    const [users] = await connection.query(
      `SELECT u.*, uni.nombre as unidad_nombre 
       FROM usuarios u 
       LEFT JOIN unidades uni ON u.unidad_id = uni.id 
       WHERE u.email = ? AND u.password = ?`,
      [email, password]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];
    
    // Registrar el inicio de sesión en auditoría
    await registrarAuditoria({
      usuario_nombre: user.nombre,
      usuario_id: user.id,
      accion: 'inicio_sesion',
      detalles: 'Inicio de sesión exitoso'
    });

    res.json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      unidad_id: user.unidad_id,
      unidad_nombre: user.unidad_nombre
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/auth/me', async (req, res) => {
  const userId = req.user.id;
  let connection;

  try {
    connection = await pool.getConnection();
    const [users] = await connection.query(
      `SELECT u.*, uni.nombre as unidad_nombre 
       FROM usuarios u 
       LEFT JOIN unidades uni ON u.unidad_id = uni.id 
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      unidad_id: user.unidad_id,
      unidad_nombre: user.unidad_nombre
    });
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para obtener productos
app.get('/api/productos', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Construir la consulta base
    let query = `
      SELECT p.*, b.nombre as bodega_nombre, u.nombre as unidad_nombre
      FROM productos p
      LEFT JOIN bodegas b ON p.bodega_id = b.id
      LEFT JOIN unidades u ON b.unidad_id = u.id
    `;
    
    const params = [];

    // Si no es admin, filtrar por unidad
    if (req.user.role !== 'admin') {
      query += ' WHERE b.unidad_id = ?';
      params.push(req.user.unidad_id);
    }

    query += ' ORDER BY p.nombre';

    const [productos] = await connection.query(query, params);
    res.json(productos);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para crear producto
app.post('/api/productos', async (req, res) => {
  const { codigo, nombre, descripcion, cantidad, precio, bodega_id } = req.body;
  let connection;

  try {
    connection = await pool.getConnection();

    // Verificar si el usuario tiene acceso a la bodega
    if (req.user.role !== 'admin') {
      const [bodegas] = await connection.query(
        'SELECT * FROM bodegas WHERE id = ? AND unidad_id = ?',
        [bodega_id, req.user.unidad_id]
      );
      if (bodegas.length === 0) {
        return res.status(403).json({ error: 'No tienes acceso a esta bodega' });
      }
    }

    const [result] = await connection.query(
      'INSERT INTO productos (codigo, nombre, descripcion, cantidad, precio, bodega_id) VALUES (?, ?, ?, ?, ?, ?)',
      [codigo, nombre, descripcion, cantidad, precio, bodega_id]
    );

    await registrarAuditoria({
      usuario_nombre: req.user.name,
      accion: 'creación',
      detalles: `Se creó el producto ${nombre}`,
      tabla_afectada: 'productos',
      registro_id: result.insertId
    });

    res.status(201).json({
      message: 'Producto creado exitosamente',
      id: result.insertId
    });
  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// Middleware para verificar si el usuario es superadmin o gestor
const verificarSuperAdmin = (req, res, next) => {
  console.log('Headers en verificarSuperAdmin:', req.headers);
  
  const userEmail = req.headers['x-user-email'] || req.user?.email;
  console.log('Email detectado:', userEmail);
  
  // Permitir acceso al superadmin y al gestor de usuarios
  if (userEmail === 'admin@example.com' || userEmail === 'gestion@usuarios.com') {
    console.log('Acceso autorizado para:', userEmail);
    return next();
  }
  
  console.log('Acceso denegado para:', userEmail);
  return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
};

// Ruta para obtener todos los usuarios
app.get('/api/usuarios', verificarSuperAdmin, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [users] = await connection.query(
      `SELECT u.*, uni.nombre as unidad_nombre 
       FROM usuarios u 
       LEFT JOIN unidades uni ON u.unidad_id = uni.id 
       ORDER BY u.nombre`
    );
    
    // Omitir las contraseñas en la respuesta
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
    
    res.json(safeUsers);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para crear un nuevo usuario
app.post('/api/usuarios', verificarSuperAdmin, async (req, res) => {
  let connection;
  try {
    const { nombre, email, password, rol, unidad_id } = req.body;
    
    // Validar datos requeridos
    if (!nombre || !email || !password || !unidad_id) {
      return res.status(400).json({ 
        message: 'Faltan datos requeridos', 
        required: { nombre: !!nombre, email: !!email, password: !!password, unidad_id: !!unidad_id } 
      });
    }
    
    connection = await pool.getConnection();
    
    // Verificar si el correo ya existe
    const [existingUsers] = await connection.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }
    
    // Verificar si la unidad existe
    const [existingUnidades] = await connection.query(
      'SELECT id FROM unidades WHERE id = ?',
      [unidad_id]
    );
    
    if (existingUnidades.length === 0) {
      return res.status(400).json({ message: 'La unidad seleccionada no existe' });
    }
    
    // Insertar el nuevo usuario
    const [result] = await connection.query(
      `INSERT INTO usuarios (nombre, email, password, rol, unidad_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, email, password, rol || 'usuario', unidad_id]
    );
    
    // Registrar en auditoría
    await registrarAuditoria({
      usuario_id: req.user?.id || 1,
      usuario_nombre: req.user?.name || 'Sistema',
      accion: 'creación',
      tabla_afectada: 'usuarios',
      registro_id: result.insertId,
      detalles: `Se creó el usuario ${nombre} con correo ${email} y rol ${rol || 'usuario'}`
    });
    
    res.status(201).json({ 
      id: result.insertId,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para eliminar un usuario
app.delete('/api/usuarios/:id', verificarSuperAdmin, async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;
    
    // No permitir eliminar al superadmin
    if (userId === '1') {
      return res.status(403).json({ message: 'No se puede eliminar al usuario administrador principal' });
    }
    
    connection = await pool.getConnection();
    
    // Verificar si el usuario existe
    const [existingUser] = await connection.query(
      'SELECT * FROM usuarios WHERE id = ?',
      [userId]
    );
    
    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Eliminar el usuario
    await connection.query('DELETE FROM usuarios WHERE id = ?', [userId]);
    
    // Registrar en auditoría
    await registrarAuditoria({
      usuario_id: req.user?.id || 1,
      usuario_nombre: req.user?.name || 'Sistema',
      accion: 'eliminación',
      tabla_afectada: 'usuarios',
      registro_id: userId,
      detalles: `Se eliminó el usuario ${existingUser[0].nombre} con correo ${existingUser[0].email}`
    });
    
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Ruta para crear una nueva unidad
app.post('/api/unidades', async (req, res) => {
  const { nombre, descripcion } = req.body;
  let connection;
  
  try {
    if (!nombre) {
      return res.status(400).json({ message: 'El nombre de la unidad es requerido' });
    }
    
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO unidades (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );
    
    await registrarAuditoria({
      usuario_nombre: req.headers['x-user-name'] || 'Gestor de usuarios',
      usuario_id: req.headers['x-user-id'] || null,
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