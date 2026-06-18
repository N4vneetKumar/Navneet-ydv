import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (phone: string) => Promise<void>;
  verifyAndLogin: (phone: string, firebaseUid?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateFcmToken: (token: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isHydrated: false,

  login: async (phone: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/dev-login', { phone });
      await SecureStore.setItemAsync('auth_token', data.token);
      set({ token: data.token, user: data.user, isLoading: false });
    } catch (err: unknown) {
      set({ isLoading: false });
      throw err;
    }
  },

  verifyAndLogin: async (phone: string, firebaseUid?: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/verify', { phone, firebase_uid: firebaseUid });
      await SecureStore.setItemAsync('auth_token', data.token);
      set({ token: data.token, user: data.user, isLoading: false });
    } catch (err: unknown) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ user: null, token: null });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const { data } = await api.get('/users/me');
        set({ token, user: data, isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      set({ isHydrated: true, token: null, user: null });
    }
  },

  refreshUser: async () => {
    const { data } = await api.get('/users/me');
    set({ user: data });
  },

  updateFcmToken: async (fcmToken: string) => {
    await api.patch('/users/me/fcm-token', { fcm_token: fcmToken });
  },
}));
