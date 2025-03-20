import axios from 'axios';
import { auditoriaService } from './auditoria';

const API_URL = 'http://localhost:5000';

// Configurar axios para incluir headers en todas las peticiones
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir el nombre de usuario a todas las peticiones
axiosInstance.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.user?.name) {
      config.headers['user-name'] = user.user.name;
      config.headers['user-id'] = user.user.id;
      config.headers['user-role'] = user.user.role;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Credenciales de prueba (SOLO PARA DESARROLLO)
const TEST_CREDENTIALS = {
  email: 'brandon@ejemplo.com',
  password: 'Patrones123'
};

export const authService = {
  async login(email, password) {
    try {
      if (email === TEST_CREDENTIALS.email && password === TEST_CREDENTIALS.password) {
        const mockResponse = {
          user: {
            id: 1,
            email: email,
            name: 'Brandon',
            role: 'admin'
          },
          token: 'mock-jwt-token'
        };
        
        // Guardar en localStorage antes de registrar la auditoría
        localStorage.setItem('user', JSON.stringify(mockResponse));

        // Registrar el login usando el nuevo servicio de auditoría
        await auditoriaService.registrar(
          'login',
          'usuarios',
          {
            email: email,
            nombre: mockResponse.user.name
          }
        );

        return mockResponse;
      } else {
        throw new Error('Credenciales inválidas');
      }
    } catch (error) {
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  },

  async logout() {
    try {
      const user = this.getCurrentUser();
      if (user) {
        await auditoriaService.registrar(
          'logout',
          'usuarios',
          {
            email: user.user.email,
            nombre: user.user.name
          }
        );
      }
    } catch (error) {
      console.error('Error al registrar el cierre de sesión:', error);
    } finally {
      localStorage.removeItem('user');
    }
  },

  getCurrentUser() {
    return JSON.parse(localStorage.getItem('user'));
  },

  isAuthenticated() {
    const user = this.getCurrentUser();
    return !!user?.token;
  }
};