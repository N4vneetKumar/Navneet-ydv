import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, List } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { ActivityLog } from '../../types';

export default function AdminMoreScreen() {
  const { user, logout } = useAuthStore();
  const [activity, setActivity] = useState<ActivityLog[]>([]);

  useFocusEffect(useCallback(async () => {
    const { data } = await api.get('/dashboard/activity', { params: { limit: 30 } });
    setActivity(data);
  }, []));

  return (
    <ScrollView style={styles.container}>
      <Text variant="titleLarge" style={styles.section}>Admin Profile</Text>
      <List.Item title={user?.name} description={user?.phone} left={(props) => <List.Icon {...props} icon="account" />} />

      <Text variant="titleLarge" style={styles.section}>Activity Log</Text>
      {activity.map((a) => (
        <List.Item
          key={a.id}
          title={a.action}
          description={new Date(a.created_at).toLocaleString()}
          left={(props) => <List.Icon {...props} icon="history" />}
        />
      ))}

      <Button mode="contained" onPress={logout} style={styles.logout} buttonColor="#F44336">
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  section: { padding: 16, color: '#2E7D32' },
  logout: { margin: 24 },
});
