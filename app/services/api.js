// filepath: app/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const configuredBaseURL = process.env.EXPO_PUBLIC_API_URL?.trim();
const baseURL = configuredBaseURL || 'http://127.0.0.1:5000/api';

if (!configuredBaseURL) {
  console.warn(
    'EXPO_PUBLIC_API_URL is not set. The localhost fallback only works on the development machine; ' +
    'set it to the computer LAN address when using Expo Go on a phone.',
  );
}

console.log('🌐 API Base URL:', baseURL);

const api = axios.create({
  baseURL,
  timeout: 10000,
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
  const requestURL = error.config?.url || '';
  if (error.response?.status === 401 && !requestURL.includes('/auth/login') && !requestURL.includes('/auth/register')) {
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

// Households
export const getMyHousehold = () => api.get('/households/my');
export const getWardHouseholds = () => api.get('/households/ward');
export const downloadQRCode = (id) => api.get(`/households/qr-image/${id}`, { responseType: 'blob' });

// Collector scan
export const collectorScan = (qrCode, location, note = '') =>
  api.post('/points/collector-scan', { qrCode, location, note });

// Collector stats
export const getCollectorStats = () => api.get('/points/collector-stats');

// Leaderboard
export const getLeaderboard = async (limit = 20) => {
  const res = await api.get(`/points/leaderboard?limit=${limit}`);
  return res.data;
};

// Badges
export const getBadges = async () => {
  const res = await api.get('/points/badges');
  return res.data;
};

// BMC Collections (for BMC Collector role)
export const logBMCCollection = async (data) => {
  const res = await api.post('/bmc-collections', data);
  return res;
};

export const getBMCCollections = async (options = {}) => {
  const { filter = 'all' } = options;
  const res = await api.get(`/bmc-collections?filter=${filter}`);
  return res;
};

export const getAssignedCollectionPoints = async () => {
  const res = await api.get('/bmc-collections/points/assigned');
  return res;
};

export const getBMCCollectionHistory = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.wasteType) params.append('wasteType', filters.wasteType);
  
  const res = await api.get(`/bmc-collections/history?${params.toString()}`);
  return res;
};

// Society Representative (Task 1)
export const submitSocietyApplication = async (data) => {
  const res = await api.post('/societies', data);
  return res.data;
};

export const getMySociety = async () => {
  const res = await api.get('/societies/my');
  return res.data;
};

export const getSocietyQrData = async (societyId) => {
  const res = await api.get(`/societies/${societyId}/qr-image?format=json`);
  return res.data;
};

// Society Membership & Internal Collector (Task 2)
export const submitSocietyJoinRequest = async (data) => {
  const res = await api.post('/societies/join-request', data);
  return res.data;
};

export const getMyMembership = async () => {
  const res = await api.get('/societies/my-membership');
  return res.data;
};

export const getSocietyMembers = async () => {
  const res = await api.get('/societies/my/members');
  return res.data;
};

export const reviewMembershipRequest = async (membershipId, data) => {
  const res = await api.patch(`/societies/members/${membershipId}/review`, data);
  return res.data;
};

export const lookupCollectorByPhone = async (phone) => {
  const res = await api.get(`/societies/collector-lookup?phone=${encodeURIComponent(phone)}`);
  return res.data;
};

export const assignInternalCollector = async (phone) => {
  const res = await api.post('/societies/my/collector', { phone });
  return res.data;
};

export const getSocietyHouseholds = async () => {
  const res = await api.get('/households/society');
  return res.data;
};

// Task 4: Society QR Resolution and Handovers
export const resolveSocietyQr = async (qrCode) => {
  const res = await api.post('/bmc-collections/resolve-society-qr', { qrCode });
  return res.data;
};

export const getSocietyHandovers = async () => {
  const res = await api.get('/societies/my/handovers');
  return res.data;
};

// Task 5: Society Rewards & Vouchers
export const getSocietyRewardsCatalogue = async () => {
  const res = await api.get('/society-rewards/catalogue');
  return res.data;
};

export const redeemSocietyReward = async (rewardId, requestId) => {
  const res = await api.post('/society-rewards/redeem', { rewardId, requestId });
  return res.data;
};

export const getMySocietyVouchers = async () => {
  const res = await api.get('/society-rewards/my/vouchers');
  return res.data;
};

export const getSocietyTransactions = async () => {
  const res = await api.get('/society-rewards/my/transactions');
  return res.data;
};

export default api;

