import axios from 'axios';

const API_URL = 'http://localhost:5000';

// Configurar axios para incluir headers en todas las peticiones
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir los encabezados de autenticación
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData.user && userData.token) {
          config.headers['Authorization'] = `Bearer ${userData.token}`;
          config.headers['X-User-Id'] = userData.user.id;
          config.headers['X-User-Name'] = userData.user.nombre;
          config.headers['X-User-Role'] = userData.user.rol;
        }
      }
    } catch (error) {
      console.error('Error al procesar el usuario:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Credenciales de prueba (SOLO PARA DESARROLLO)
const TEST_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'admin123'
};

export const authService = {
  async login(email, password) {
    try {
      console.log('Intentando login con:', { email, password });
      const response = await axiosInstance.post('/api/auth/login', { email, password });
      console.log('Respuesta del servidor:', response.data);
      
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
      }
      throw new Error('Respuesta inválida del servidor');
    } catch (error) {
      console.error('Error completo en login:', error);
      if (error.response) {
        throw new Error(error.response.data.message || error.response.data.error || 'Error al iniciar sesión');
      }
      throw new Error('Error de conexión con el servidor');
    }
  },

  logout() {
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      localStorage.removeItem('user');
      return null;
    }
  },

  isAuthenticated() {
    const user = this.getCurrentUser();
    return !!user?.token;
  }
};