import axios from 'axios';

// const api = axios.create({
//     baseURL: 'http://localhost:5000/api'
// });
const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    headers: {
        'ngrok-skip-browser-warning': 'true' // Isso aqui é a chave!
    }
});

api.interceptors.request.use((config) => {
    // MUDANÇA AQUI: sessionStorage em vez de localStorage
    const token = sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            sessionStorage.clear(); // Limpa apenas a sessão desta aba
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;