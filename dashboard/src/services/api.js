// filepath: dashboard/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('gp_token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    throw error;
  }
);

export const login = (phone, password) => api.post('/auth/login', { phone, password });

export const getWardStats = () => api.get('/dashboard/ward-stats');

export const getRecentViolations = () => api.get('/dashboard/recent-violations');

export const getAllViolations = (params) => {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.type) query.append('type', params.type);
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  return api.get(`/violations/all?${query.toString()}`);
};

export const resolveViolation = (id, outcome) => api.put(`/violations/${id}/resolve`, { outcome });

export const getCitizens = (params) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  return api.get(`/dashboard/citizens?${query.toString()}`);
};

export const getCampaigns = () => api.get('/awareness/campaigns'); // Usually officer can view all and deactivate.. 

export const createCampaign = (data) => api.post('/dashboard/campaigns', data);

export const deactivateCampaign = (id) => api.patch(`/dashboard/campaigns/${id}/deactivate`);

export default api;
