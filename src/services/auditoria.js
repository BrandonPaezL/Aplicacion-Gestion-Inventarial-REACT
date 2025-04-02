import axios from 'axios';

const API_URL = 'http://localhost:5000';

// Crear una instancia de axios con configuración base
const auditAxios = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir información del usuario
auditAxios.interceptors.request.use((config) => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      if (userData.user) {
        config.headers['Authorization'] = `Bearer ${userData.token}`;
        config.headers['X-User-Id'] = userData.user.id;
        config.headers['X-User-Name'] = userData.user.nombre;
        config.headers['X-User-Role'] = userData.user.rol;
      }
    }
  } catch (error) {
    console.error('Error al procesar el usuario para auditoría:', error);
  }
  return config;
});

class AuditoriaService {
  constructor() {
    this.getUserInfo = () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      
      try {
        const user = JSON.parse(userStr);
        return user?.user || null;
      } catch {
        return null;
      }
    };
  }

  async registrar(accion, tabla, detalles = {}, registroId = null) {
    const user = this.getUserInfo();
    if (!user) {
      console.warn('No hay usuario autenticado para la auditoría');
      return;
    }

    const datos = {
      usuario_id: user.id,
      usuario_nombre: user.nombre || user.name,
      accion: accion,
      tabla_afectada: tabla,
      registro_id: registroId,
      detalles: {
        ...detalles,
        ip: window.location.hostname,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };

    try {
      const response = await auditAxios.post('/auditorias', datos);
      console.log('Auditoría registrada:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error al registrar auditoría:', error);
      // No lanzar el error para no interrumpir el flujo principal
      return null;
    }
  }

  async obtenerRegistros(filtros = {}) {
    try {
      const response = await auditAxios.get('/auditorias', { params: filtros });
      return response.data;
    } catch (error) {
      console.error('Error al obtener registros de auditoría:', error);
      throw error;
    }
  }
}

export const auditoriaService = new AuditoriaService(); 