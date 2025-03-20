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
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user?.user) {
      config.headers['X-User-Name'] = user.user.name;
      config.headers['X-User-Id'] = user.user.id;
      config.headers['X-User-Role'] = user.user.role;
    }
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
      console.error('No hay usuario autenticado');
      return;
    }

    const datos = {
      usuario_id: user.id,
      usuario_nombre: user.name,
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
      throw error;
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