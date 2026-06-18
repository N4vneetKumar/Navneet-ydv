import { create } from 'zustand';
import api from '../services/api';
import { cacheData, getCachedData } from '../services/offlineQueue';
import { Order, Rate } from '../types';

interface AppState {
  rates: Rate[];
  orders: Order[];
  isSyncing: boolean;
  fetchRates: () => Promise<void>;
  fetchOrders: (status?: string) => Promise<void>;
  setOrders: (orders: Order[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  rates: [],
  orders: [],
  isSyncing: false,

  fetchRates: async () => {
    try {
      const { data } = await api.get<Rate[]>('/rates');
      set({ rates: data });
      await cacheData('rates', data);
    } catch {
      const cached = await getCachedData<Rate[]>('rates');
      if (cached) set({ rates: cached });
    }
  },

  fetchOrders: async (status?: string) => {
    const params = status ? { status } : {};
    const { data } = await api.get<Order[]>('/orders', { params });
    set({ orders: data });
  },

  setOrders: (orders) => set({ orders }),
}));
