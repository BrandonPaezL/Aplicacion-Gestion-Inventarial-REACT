import axios from 'axios';

// Configuración base de axios
const instance = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para mostrar información de las solicitudes
instance.interceptors.request.use(
  (config) => {
    console.log('Enviando solicitud a:', config.url);
    console.log('Headers:', config.headers);
    console.log('Datos:', config.data);
    return config;
  },
  (error) => {
    console.error('Error en la solicitud:', error);
    return Promise.reject(error);
  }
);

// Interceptor para mostrar información de las respuestas
instance.interceptors.response.use(
  (response) => {
    console.log('Respuesta exitosa de:', response.config.url);
    return response;
  },
  (error) => {
    console.error('Error en la respuesta:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default instance; 