import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
});

// Token is set in-memory only, never persisted to localStorage
// The App component manages the token in React state and sets it here
let inMemoryToken = null;

export const setApiToken = (token) => {
    inMemoryToken = token;
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export const getApiToken = () => inMemoryToken;

export default api;
