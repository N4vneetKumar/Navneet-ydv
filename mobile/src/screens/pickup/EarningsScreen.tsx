import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, List } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Settlement } from '../../types';

export default function PickupEarningsScreen() {
  const { user, refreshUser } = useAuthStore();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [monthCommission, setMonthCommission] = useState(0);

  useFocusEffect(useCallback(async () => {
    await refreshUser();
    if (user) {
      const { data } = await api.get(`/users/${user.id}`);
      setSettlements(data.stats?.settlements || []);
      const { data: completed } = await api.get('/orders', { params: { status: 'completed' } });
      const thisMonth = new Date().getMonth();
      const commission = completed
        .filter((o: { completed_at?: string }) => o.completed_at && new Date(o.completed_at).getMonth() === thisMonth)
        .reduce((sum: number, o: { commission_amount?: number }) => sum + (o.commission_amount || 0), 0);
      setMonthCommission(commission);
    }
  }, [user?.id]));

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelMedium">Commission This Month</Text>
          <Text variant="headlineLarge" style={styles.amount}>₹{monthCommission}</Text>
        </Card.Content>
      </Card>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelMedium">Pending Payout</Text>
          <Text variant="headlineLarge" style={styles.pending}>₹{user?.pending_payout || 0}</Text>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.section}>Settlement History</Text>
      {settlements.map((s) => (
        <List.Item
          key={s.id}
          title={`₹${s.amount} via ${s.payment_mode}`}
          description={new Date(s.created_at).toLocaleDateString()}
          left={(props) => <List.Icon {...props} icon="cash" />}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  card: { marginBottom: 12 },
  amount: { color: '#2E7D32', fontWeight: 'bold' },
  pending: { color: '#FF9800', fontWeight: 'bold' },
  section: { marginTop: 16, marginBottom: 8, color: '#2E7D32' },
});
