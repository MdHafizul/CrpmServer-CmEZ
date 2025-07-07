import { create } from 'zustand';

const useStatusLPCStore = create((set) => ({
  filter: 'ALL',
  setFilter: (filter) => set({ filter }),
}));

export default useStatusLPCStore;