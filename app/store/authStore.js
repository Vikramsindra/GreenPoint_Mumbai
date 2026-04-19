// filepath: app/store/authStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      loadStoredAuth: async () => {
        set({ isLoading: true, error: null });
        try {
          const token = await AsyncStorage.getItem('gp_token');
          if (token) {
            const res = await api.getMe();
            set({ user: res.data, token, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          await AsyncStorage.removeItem('gp_token');
          set({ user: null, token: null, isLoading: false, error: 'Session expired' });
        }
      },

      login: async (phone, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.login(phone, password);
          await AsyncStorage.setItem('gp_token', res.data.token);
          set({ user: res.data.user, token: res.data.token, isLoading: false });
        } catch (error) {
          const msg = error.response?.data?.message || 'Login failed';
          set({ isLoading: false, error: msg });
          throw new Error(msg);
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.register(data);
          await AsyncStorage.setItem('gp_token', res.data.token);
          set({ user: res.data.user, token: res.data.token, isLoading: false });
        } catch (error) {
          const msg = error.response?.data?.message || 'Registration failed';
          set({ isLoading: false, error: msg });
          throw new Error(msg);
        }
      },

      logout: async () => {
        await AsyncStorage.removeItem('gp_token');
        set({ user: null, token: null, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token }), // only persist token
    }
  )
);
