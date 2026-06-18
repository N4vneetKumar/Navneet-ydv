import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Modal, ScrollView } from 'react-native';
import { SegmentedButtons, FAB, TextInput, Button, Text, List } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { User } from '../../types';

const TABS = [
  { value: 'customer', label: 'Customers' },
  { value: 'pickup_boy', label: 'Boys' },
  { value: 'admin', label: 'Admins' },
];

export default function AdminUsersScreen() {
  const [tab, setTab] = useState('customer');
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', commission_rate: '10', vehicle_type: '' });
  const [selected, setSelected] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [settleAmount, setSettleAmount] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get<User[]>('/users', { params: { role: tab, search: search || undefined } });
    setUsers(data);
  }, [tab, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addUser = async () => {
    await api.post('/users', {
      name: form.name,
      phone: form.phone,
      role: tab,
      commission_rate: tab === 'pickup_boy' ? parseFloat(form.commission_rate) : undefined,
      vehicle_type: tab === 'pickup_boy' ? form.vehicle_type : undefined,
    });
    setShowAdd(false);
    setForm({ name: '', phone: '', commission_rate: '10', vehicle_type: '' });
    load();
  };

  const openProfile = async (user: User) => {
    const { data } = await api.get(`/users/${user.id}`);
    setSelected(user);
    setProfile(data);
  };

  const blockUser = async () => {
    if (!selected) return;
    await api.patch(`/users/${selected.id}`, { is_blocked: true });
    setSelected(null);
    load();
  };

  const settle = async () => {
    if (!selected || !settleAmount) return;
    await api.post(`/users/${selected.id}/settle`, {
      amount: parseFloat(settleAmount),
      payment_mode: 'cash',
    });
    setSettleAmount('');
    openProfile(selected);
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons value={tab} onValueChange={setTab} buttons={TABS} style={styles.segment} />
      <TextInput placeholder="Search..." value={search} onChangeText={setSearch} mode="outlined" style={styles.search} />

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${item.phone} • ${item.role}`}
            onPress={() => openProfile(item)}
            right={() => item.is_blocked ? <Text style={styles.blocked}>BLOCKED</Text> : null}
          />
        )}
      />

      <FAB icon="plus" style={styles.fab} onPress={() => setShowAdd(true)} />

      <Modal visible={showAdd} animationType="slide">
        <ScrollView style={styles.modal}>
          <Text variant="titleLarge">Add {tab.replace('_', ' ')}</Text>
          <TextInput label="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} mode="outlined" style={styles.input} />
          <TextInput label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" mode="outlined" style={styles.input} />
          {tab === 'pickup_boy' && (
            <>
              <TextInput label="Commission %" value={form.commission_rate} onChangeText={(v) => setForm({ ...form, commission_rate: v })} mode="outlined" style={styles.input} />
              <TextInput label="Vehicle Type" value={form.vehicle_type} onChangeText={(v) => setForm({ ...form, vehicle_type: v })} mode="outlined" style={styles.input} />
            </>
          )}
          <Button mode="contained" onPress={addUser} style={styles.btn}>Create</Button>
          <Button onPress={() => setShowAdd(false)}>Cancel</Button>
        </ScrollView>
      </Modal>

      <Modal visible={!!selected} animationType="slide">
        <ScrollView style={styles.modal}>
          {selected && profile && (
            <>
              <Text variant="titleLarge">{selected.name}</Text>
              <Text>Earnings/Pickups: ₹{profile.total_earnings} / {profile.total_pickups}</Text>
              {tab === 'pickup_boy' && (
                <>
                  <Text>Pending Payout: ₹{profile.pending_payout}</Text>
                  <TextInput label="Settle Amount" value={settleAmount} onChangeText={setSettleAmount} keyboardType="decimal-pad" mode="outlined" style={styles.input} />
                  <Button mode="contained" onPress={settle}>Settle Payment</Button>
                </>
              )}
              {tab === 'customer' && (
                <Button mode="outlined" onPress={blockUser} textColor="#F44336">Block Customer</Button>
              )}
              <Button onPress={() => setSelected(null)} style={styles.btn}>Close</Button>
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  segment: { margin: 12 },
  search: { marginHorizontal: 12, marginBottom: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2E7D32' },
  modal: { flex: 1, padding: 24, paddingTop: 48 },
  input: { marginBottom: 12 },
  btn: { marginVertical: 8 },
  blocked: { color: '#F44336', alignSelf: 'center' },
});
