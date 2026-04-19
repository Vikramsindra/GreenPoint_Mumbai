// filepath: dashboard/src/store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../services/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      
      login: async (phone, password) => {
        try {
          const res = await api.login(phone, password);
          localStorage.setItem('gp_token', res.data.token);
          set({ user: res.data.user, token: res.data.token });
          return res;
        } catch (error) {
          throw error;
        }
      },
      
      logout: () => {
        localStorage.removeItem('gp_token');
        set({ user: null, token: null });
        window.location.href = '/login';
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token })
    }
  )
);
