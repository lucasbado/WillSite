import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api'
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
        // Trata erro de conexão (quando o Render está "acordando")
        if (!error.response) {
            console.error("Erro de rede: O servidor pode estar iniciando.");
        }

        if (error.response && error.response.status === 401) {
            sessionStorage.clear();
            // Evita redirecionar se o usuário já estiver na página de login
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;