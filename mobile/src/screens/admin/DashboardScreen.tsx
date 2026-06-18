import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import OrderCard from '../../components/orders/OrderCard';
import { DashboardStats } from '../../types';

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<{ action: string; admin_name?: string; created_at: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [statsRes, activityRes] = await Promise.all([
      api.get<DashboardStats>('/dashboard/stats'),
      api.get('/dashboard/activity', { params: { limit: 10 } }),
    ]);
    setStats(statsRes.data);
    setActivity(activityRes.data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="labelMedium">Today's Orders</Text>
            <Text variant="headlineMedium">{stats?.today_orders ?? '—'}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="labelMedium">Today's Revenue</Text>
            <Text variant="headlineMedium">₹{stats?.today_revenue ?? 0}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="labelMedium">Pending Orders</Text>
            <Text variant="headlineMedium">{stats?.pending_orders ?? '—'}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="labelMedium">Active Boys</Text>
            <Text variant="headlineMedium">{stats?.active_boys ?? '—'}</Text>
          </Card.Content>
        </Card>
      </View>

      {stats?.flagged_orders?.length ? (
        <>
          <Text variant="titleMedium" style={styles.section}>Flagged Orders (RED)</Text>
          {stats.flagged_orders.map((o) => (
            <OrderCard key={o.id} order={o} showFlag />
          ))}
        </>
      ) : null}

      <Text variant="titleMedium" style={styles.section}>Recent Activity</Text>
      {activity.map((a, i) => (
        <Text key={i} variant="bodyMedium" style={styles.activity}>
          • {a.action}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  statCard: { width: '48%', margin: '1%' },
  section: { padding: 16, color: '#2E7D32', fontWeight: 'bold' },
  activity: { paddingHorizontal: 16, paddingBottom: 8, color: '#555' },
});
