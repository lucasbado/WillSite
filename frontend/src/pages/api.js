import axios from 'axios';

// Em desenvolvimento, /api passa pelo proxy local. Produção pode configurar outra origem.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 90000
});

api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            console.error("Erro de conexão. Verifique se o backend está rodando.");
        }
        if (error.response?.status === 401 && error.config?.headers?.Authorization && !error.config?.url?.includes('/auth/login')) {
            sessionStorage.clear();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
