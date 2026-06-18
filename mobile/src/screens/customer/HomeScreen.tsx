import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, Card, Button, FAB, Banner } from 'react-native-paper';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { syncOfflineQueue } from '../../services/offlineQueue';
import { Order } from '../../types';

export default function CustomerHomeScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [disputeOrder, setDisputeOrder] = useState<Order | null>(null);
  const [countdown, setCountdown] = useState('');
  const [pendingSync, setPendingSync] = useState(0);

  const loadDispute = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/dispute/active');
      setDisputeOrder(data);
    } catch {
      setDisputeOrder(null);
    }
  }, []);

  useEffect(() => {
    loadDispute();
    syncOfflineQueue().then((r) => setPendingSync(r.synced));
    const interval = setInterval(loadDispute, 10000);
    return () => clearInterval(interval);
  }, [loadDispute]);

  useEffect(() => {
    if (!disputeOrder?.dispute_expires_at) return;
    const tick = () => {
      const remaining = new Date(disputeOrder.dispute_expires_at!).getTime() - Date.now();
      if (remaining <= 0) {
        setDisputeOrder(null);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [disputeOrder]);

  const raiseDispute = async () => {
    if (!disputeOrder) return;
    try {
      await api.post(`/orders/${disputeOrder.id}/dispute`, { reason: 'Weight/amount mismatch' });
      setDisputeOrder(null);
      alert('Dispute raised. Admin has been notified.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Failed to raise dispute');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Button icon="menu" textColor="#fff" onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
            Menu
          </Button>
          <Text variant="headlineSmall" style={styles.greeting}>
            Hello, {user?.name}!
          </Text>
        </View>

        {disputeOrder && (
          <Banner visible actions={[{ label: 'Raise Dispute', onPress: raiseDispute }]}>
            Receipt: {disputeOrder.actual_weight}kg • ₹{disputeOrder.total_amount}. Dispute window: {countdown}
          </Banner>
        )}

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelMedium">Total Pickups</Text>
              <Text variant="headlineMedium" style={styles.statValue}>{user?.total_pickups || 0}</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="labelMedium">Total Earnings</Text>
              <Text variant="headlineMedium" style={styles.statValue}>₹{user?.total_earnings || 0}</Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.actionCard} onPress={() => navigation.navigate('RaisePickup')}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.actionTitle}>Raise Pickup Request</Text>
            <Text variant="bodyMedium">Schedule a scrap pickup at your doorstep</Text>
          </Card.Content>
        </Card>

        <Button mode="text" onPress={() => navigation.navigate('Prices')} style={styles.linkBtn}>
          Know Prices →
        </Button>

        {pendingSync > 0 && (
          <Text style={styles.syncText}>✓ {pendingSync} offline order(s) synced</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#2E7D32', padding: 16, paddingTop: 48 },
  greeting: { color: '#fff', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1 },
  statValue: { color: '#2E7D32', fontWeight: 'bold' },
  actionCard: { margin: 16, backgroundColor: '#E8F5E9' },
  actionTitle: { color: '#2E7D32', fontWeight: 'bold' },
  linkBtn: { alignSelf: 'center' },
  syncText: { textAlign: 'center', color: '#666', marginBottom: 16 },
});
