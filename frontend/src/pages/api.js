import axios from 'axios';

// 1. Define a URL: Se houver variável de ambiente, usa ela. 
// Se não, usa o seu link do ngrok que você sabe que funciona localmente.
const api = axios.create({
  baseURL: 'https://cidinho.onrender.com/api', // Adicione o /api aqui
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
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
        if (error.response && error.response.status === 401) {
            sessionStorage.clear();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;