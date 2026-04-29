import { create } from 'zustand';

export const useCollectionStore = create((set) => ({
  lastCollectionTime: null,
  collectionCount: 0,
  
  // Trigger when a new collection is logged
  recordCollection: () => {
    set((state) => ({
      lastCollectionTime: new Date(),
      collectionCount: state.collectionCount + 1,
    }));
  },
  
  // Reset the trigger (after dashboard has refreshed)
  clearTrigger: () => {
    set({ lastCollectionTime: null });
  },
}));
