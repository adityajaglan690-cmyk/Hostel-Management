import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hostel_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect on login attempt failure
      if (!error.config.url.includes('/auth/login')) {
        localStorage.removeItem('hostel_token');
        localStorage.removeItem('hostel_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
