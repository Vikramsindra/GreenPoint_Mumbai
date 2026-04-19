import { create } from 'zustand';

export const useUiStore = create((set) => ({
  isMenuOpen: false,
  openMenu: () => set({ isMenuOpen: true }),
  closeMenu: () => set({ isMenuOpen: false })
}));
