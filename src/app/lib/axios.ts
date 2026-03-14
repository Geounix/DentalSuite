import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true, // Send HttpOnly cookies on every request
});

// Keep the token in the Authorization header as well (backward-compatible while
// the server supports both cookie and header authentication).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Respond to 401 by clearing local user state and redirecting to the login page
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Hard redirect so the React tree re-initialises from localStorage
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export default api;
