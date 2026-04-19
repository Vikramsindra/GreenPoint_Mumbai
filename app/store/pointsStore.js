// filepath: app/store/pointsStore.js
import { create } from 'zustand';
import * as api from '../services/api';

export const usePointsStore = create((set, get) => ({
  balance: 0,
  history: [],
  isLoading: false,

  fetchBalance: async () => {
    try {
      const res = await api.getBalance();
      set({ balance: res.data.balance });
    } catch (error) {
      console.error('Failed to fetch balance', error);
    }
  },

  fetchHistory: async (limit = 20, page = 1) => {
    try {
      const res = await api.getHistory(limit, page);
      set({ history: res.data.events });
    } catch (error) {
      console.error('Failed to fetch history', error);
    }
  },

  refresh: async () => {
    set({ isLoading: true });
    try {
      const [balRes, histRes] = await Promise.all([
        api.getBalance(),
        api.getHistory()
      ]);
      set({ balance: balRes.data.balance, history: histRes.data.events, isLoading: false });
    } catch (error) {
      console.error('Failed to refresh points state', error);
      set({ isLoading: false });
    }
  },

  optimisticAdd: (points, action, description) => {
    const { balance, history } = get();
    // Prepend mock event for fast UI updates
    const mockEvent = {
        _id: `temp_${Date.now()}`,
        type: 'EARN',
        action,
        points,
        description,
        createdAt: new Date().toISOString()
    };
    set({ balance: balance + points, history: [mockEvent, ...history] });
  }
}));
