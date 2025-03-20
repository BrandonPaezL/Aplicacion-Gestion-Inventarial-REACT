import axios from 'axios';

// Crear una instancia de axios
const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Interceptor para añadir headers de autenticación
api.interceptors.request.use(
  config => {
    // Obtener la información del usuario almacenada en localStorage
    const userInfo = JSON.parse(localStorage.getItem('user'));
    
    // Agregar headers de autenticación solo si hay un usuario logueado
    if (userInfo && userInfo.user) {
      // Usar X-User-Name y X-User-Id en lugar de user-name y user-id
      config.headers['X-User-Name'] = userInfo.user.name;
      config.headers['X-User-Id'] = userInfo.user.id;
      
      // Si el usuario tiene un rol, agregarlo también
      if (userInfo.user.role) {
        config.headers['X-User-Role'] = userInfo.user.role;
      }
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

const apiService = {
  // Productos
  getProductos: async () => {
    const response = await api.get('/productos');
    return response.data;
  },

  crearProducto: async (producto) => {
    const response = await api.post('/productos', producto);
    return response.data;
  },

  actualizarProducto: async (id, producto) => {
    const response = await api.put(`/productos/${id}`, producto);
    return response.data;
  },

  eliminarProducto: async (id) => {
    const response = await api.delete(`/productos/${id}`);
    return response.data;
  },

  // Entregas
  getEntregas: async () => {
    const response = await api.get('/entregas');
    return response.data;
  },

  crearEntrega: async (entrega) => {
    const response = await api.post('/entregas', entrega);
    return response.data;
  },

  actualizarEntrega: async (id, entrega) => {
    const response = await api.put(`/entregas/${id}`, entrega);
    return response.data;
  },

  eliminarEntrega: async (id) => {
    const response = await api.delete(`/entregas/${id}`);
    return response.data;
  },

  // Recordatorios
  getRecordatorios: async () => {
    try {
      const response = await api.get('/recordatorios');
      return response.data;
    } catch (error) {
      console.error('Error al obtener recordatorios:', error);
      throw error;
    }
  },

  crearRecordatorio: async (recordatorio) => {
    try {
      const datos = {
        ...recordatorio,
        fecha: recordatorio.fecha ? new Date(recordatorio.fecha).toISOString().split('T')[0] : null,
        producto_id: recordatorio.producto_id || null
      };
      const response = await api.post('/recordatorios', datos);
      return response.data;
    } catch (error) {
      console.error('Error al crear recordatorio:', error);
      throw error;
    }
  },

  eliminarRecordatorio: async (id) => {
    try {
      const response = await api.delete(`/recordatorios/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
      throw error;
    }
  },

  // Alertas y Estadísticas
  getProductosStockBajo: async () => {
    const response = await api.get('/productos/stock-bajo');
    return response.data;
  },

  getProductosPorVencer: async () => {
    const response = await api.get('/productos/por-vencer');
    return response.data;
  },

  getHistorico: async () => {
    const response = await api.get('/productos/historico');
    return response.data;
  },

  // Cronograma
  getCronograma: async () => {
    const response = await api.get('/cronogramas');
    return response.data;
  }
};

export default apiService;