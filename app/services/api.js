// filepath: app/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Note: Use your local IP for physical device testing
const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://10.21.179.81:5000/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('gp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => response, async (error) => {
  if (error.response?.status === 401 && !error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/register')) {
    const { useAuthStore } = require('../store/authStore');
    const logout = useAuthStore.getState().logout;
    logout();
  }
  return Promise.reject(error);
});

export const login = async (phone, password) => {
  const res = await api.post('/auth/login', { phone, password });
  return res.data;
};

export const register = async (data) => {
  const res = await api.post('/auth/register', data);
  return res.data;
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const updateMe = async (data) => {
  const res = await api.put('/auth/me', data);
  return res.data;
};

export const getBalance = async () => {
  const res = await api.get('/points/balance');
  return res.data;
};

export const getHistory = async (limit = 20, page = 1) => {
  const res = await api.get(`/points/history?limit=${limit}&page=${page}`);
  return res.data;
};

export const scanQR = async (qrCode, action, options = {}) => {
  const { collectorId = null, isSegregated = true, amount = '', notes = '' } = options;
  const res = await api.post('/points/scan', { qrCode, action, collectorId, isSegregated, amount, notes });
  return res.data;
};

export const getRedeemOptions = async () => {
  const res = await api.get('/points/redeem-options');
  return res.data;
};

export const redeemReward = async (rewardId, pointsCost) => {
  const res = await api.post('/points/redeem', { rewardId, pointsCost });
  return res.data;
};

export const getMyViolations = async () => {
  const res = await api.get('/violations/my');
  return res.data;
};

export const submitAppeal = async (violationId, appealText, appealPhotoUrl = '') => {
  const res = await api.post(`/violations/${violationId}/appeal`, { appealText, appealPhotoUrl });
  return res.data;
};

export const getCampaigns = async () => {
  const res = await api.get('/awareness/campaigns');
  return res.data;
};

export const getQuiz = async (campaignId) => {
  const res = await api.get(`/awareness/quiz/${campaignId}`);
  return res.data;
};

export const submitQuiz = async (campaignId, answers) => {
  const res = await api.post(`/awareness/quiz/${campaignId}/submit`, { answers });
  return res.data;
};

export const getWasteGuide = async () => {
  const res = await api.get('/awareness/guide');
  return res.data;
};

export default api;
