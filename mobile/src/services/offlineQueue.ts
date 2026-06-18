import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const QUEUE_KEY = 'offline_order_queue';

export interface QueuedOrder {
  id: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export async function getOfflineQueue(): Promise<QueuedOrder[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function queueOrder(payload: Record<string, unknown>): Promise<QueuedOrder> {
  const queue = await getOfflineQueue();
  const item: QueuedOrder = {
    id: `local_${Date.now()}`,
    payload,
    createdAt: new Date().toISOString(),
  };
  queue.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return item;
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getOfflineQueue();
  if (!queue.length) return { synced: 0, failed: 0 };

  const remaining: QueuedOrder[] = [];
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await api.post('/orders', item.payload);
      synced++;
    } catch {
      remaining.push(item);
      failed++;
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed };
}

export async function cacheData(key: string, data: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
