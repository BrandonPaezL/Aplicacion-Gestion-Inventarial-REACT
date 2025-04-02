import axios from 'axios';

// Crear una instancia de axios
const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir headers de autenticación
api.interceptors.request.use(
  config => {
    // Si es una consulta GET, no añadimos headers de autenticación para mantener compatibilidad
    if (config.method === 'get') {
      return config;
    }
    
    try {
      // Obtener la información del usuario almacenada en localStorage
      const userStr = localStorage.getItem('user');
      
      if (userStr) {
        const userData = JSON.parse(userStr);
        
        if (userData.user && userData.token) {
          // Añadir token de autenticación
          config.headers['Authorization'] = `Bearer ${userData.token}`;
          
          // Añadir información del usuario
          config.headers['X-User-Id'] = userData.user.id;
          config.headers['X-User-Name'] = userData.user.nombre || userData.user.name;
          config.headers['X-User-Role'] = userData.user.rol || userData.user.role;
        }
      }
    } catch (error) {
      console.error('Error al procesar usuario para API:', error);
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
    try {
      const response = await api.get('/productos');
      return response.data;
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
  },

  crearProducto: async (producto) => {
    try {
      const response = await api.post('/productos', producto);
      return response.data;
    } catch (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  },

  actualizarProducto: async (id, producto) => {
    try {
      const response = await api.put(`/productos/${id}`, producto);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      throw error;
    }
  },

  eliminarProducto: async (id) => {
    try {
      const response = await api.delete(`/productos/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      throw error;
    }
  },

  // Entregas
  getEntregas: async () => {
    try {
      const response = await api.get('/entregas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener entregas:', error);
      throw error;
    }
  },

  crearEntrega: async (entrega) => {
    try {
      const response = await api.post('/entregas', entrega);
      return response.data;
    } catch (error) {
      console.error('Error al crear entrega:', error);
      throw error;
    }
  },

  actualizarEntrega: async (id, entrega) => {
    try {
      const response = await api.put(`/entregas/${id}`, entrega);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar entrega:', error);
      throw error;
    }
  },

  eliminarEntrega: async (id) => {
    try {
      const response = await api.delete(`/entregas/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar entrega:', error);
      throw error;
    }
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
    try {
      const response = await api.get('/productos/stock-bajo');
      return response.data;
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error);
      throw error;
    }
  },

  getProductosPorVencer: async () => {
    try {
      const response = await api.get('/productos/por-vencer');
      return response.data;
    } catch (error) {
      console.error('Error al obtener productos por vencer:', error);
      throw error;
    }
  },

  getHistorico: async () => {
    try {
      const response = await api.get('/productos/historico');
      return response.data;
    } catch (error) {
      console.error('Error al obtener histórico:', error);
      throw error;
    }
  },

  // Cronograma
  getCronograma: async () => {
    try {
      const response = await api.get('/cronogramas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener cronograma:', error);
      throw error;
    }
  }
};

export default apiService;