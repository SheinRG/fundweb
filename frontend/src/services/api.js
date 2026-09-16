import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Customers
export const customerAPI = {
  list: () => api.get('/customers'),
  create: (data) => api.post('/customers', data),
};

// Products
export const productAPI = {
  list: () => api.get('/products'),
};

// Inventory
export const inventoryAPI = {
  list: () => api.get('/inventory'),
  updateStock: (productId, data) => api.patch(`/inventory/${productId}`, data),
};

// Enquiries
export const enquiryAPI = {
  list: () => api.get('/enquiries'),
  getById: (id) => api.get(`/enquiries/${id}`),
  create: (data) => api.post('/enquiries', data),
};

// Quotations
export const quotationAPI = {
  list: () => api.get('/quotations'),
  getById: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  updateStatus: (id, status) => api.patch(`/quotations/${id}/status`, { status }),
  convert: (id) => api.post(`/quotations/${id}/convert`),
};

// Sales Orders
export const salesOrderAPI = {
  list: () => api.get('/sales-orders'),
  getById: (id) => api.get(`/sales-orders/${id}`),
  confirm: (id) => api.post(`/sales-orders/${id}/confirm`),
  dispatch: (id, data) => api.post(`/sales-orders/${id}/dispatch`, data),
};

export default api;
