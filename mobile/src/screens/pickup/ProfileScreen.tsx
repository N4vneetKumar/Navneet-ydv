import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Switch, Button, List } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

export default function PickupProfileScreen() {
  const { user, logout, refreshUser } = useAuthStore();
  const [attendance, setAttendance] = useState<{ date: string; clock_in: string; clock_out?: string }[]>([]);

  useFocusEffect(useCallback(async () => {
    await refreshUser();
    const { data } = await api.get('/users/me/attendance');
    setAttendance(data);
  }, []));

  const toggleClock = async () => {
    await api.post('/users/me/clock');
    await refreshUser();
  };

  return (
    <ScrollView style={styles.container}>
      <List.Item title={user?.name} description={user?.phone} left={(p) => <List.Icon {...p} icon="account-hard-hat" />} />
      <Text variant="bodyMedium">Vehicle: {user?.vehicle_type || '—'}</Text>
      <Text variant="bodyMedium">Commission: {user?.commission_rate}%</Text>

      <View style={styles.clockRow}>
        <Text variant="titleMedium">Clock {user?.is_clocked_in ? 'Out' : 'In'}</Text>
        <Switch value={user?.is_clocked_in} onValueChange={toggleClock} />
      </View>
      <Text variant="bodySmall" style={styles.hint}>
        {user?.is_clocked_in ? 'You are clocked in — admin can assign orders' : 'Clock in to receive assignments'}
      </Text>

      <Text variant="titleMedium" style={styles.section}>Attendance (last 60 days)</Text>
      {attendance.map((a, i) => (
        <List.Item
          key={i}
          title={a.date}
          description={`In: ${new Date(a.clock_in).toLocaleTimeString()}${a.clock_out ? ` • Out: ${new Date(a.clock_out).toLocaleTimeString()}` : ' • Active'}`}
        />
      ))}

      <Button mode="contained" onPress={logout} buttonColor="#F44336" style={styles.logout}>Logout</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  clockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  hint: { color: '#666', marginBottom: 16 },
  section: { marginTop: 16, color: '#2E7D32' },
  logout: { marginTop: 32 },
});
