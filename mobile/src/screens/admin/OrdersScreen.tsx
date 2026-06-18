import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Modal, ScrollView } from 'react-native';
import { Button, Text, Menu } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import OrderCard from '../../components/orders/OrderCard';
import { Order, User } from '../../types';

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [boys, setBoys] = useState<User[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [boyId, setBoyId] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  const load = useCallback(async () => {
    const [ordersRes, boysRes] = await Promise.all([
      api.get<Order[]>('/orders', { params: { status: 'pending' } }),
      api.get<User[]>('/users', { params: { role: 'pickup_boy' } }),
    ]);
    setOrders(ordersRes.data);
    setBoys(boysRes.data.filter((b) => b.is_clocked_in && b.is_active));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const assign = async () => {
    if (!selected || !boyId) return;
    await api.patch(`/orders/${selected.id}/assign`, { assigned_boy_id: boyId });
    setSelected(null);
    setBoyId('');
    load();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => setSelected(item)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No pending orders</Text>}
      />

      <Modal visible={!!selected} animationType="slide">
        <ScrollView style={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>Assign Order</Text>
          {selected && (
            <>
              <Text>Customer: {selected.customer_name}</Text>
              <Text>Items: {selected.items.map((i) => i.item_name).join(', ')}</Text>
              <Text>Address: {selected.address?.address_line}</Text>
              <Text>Est. Weight: {selected.estimated_weight}kg</Text>

              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button mode="outlined" onPress={() => setMenuVisible(true)} style={styles.btn}>
                    {boys.find((b) => b.id === boyId)?.name || 'Select Pickup Boy (clocked in)'}
                  </Button>
                }
              >
                {boys.map((b) => (
                  <Menu.Item key={b.id} onPress={() => { setBoyId(b.id); setMenuVisible(false); }} title={b.name} />
                ))}
              </Menu>

              <Button mode="contained" onPress={assign} disabled={!boyId} style={styles.btn}>
                Assign Order
              </Button>
              <Button onPress={() => setSelected(null)}>Cancel</Button>
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  empty: { textAlign: 'center', padding: 32, color: '#999' },
  modal: { flex: 1, padding: 24, paddingTop: 48 },
  modalTitle: { color: '#2E7D32', marginBottom: 16 },
  btn: { marginVertical: 12 },
});
