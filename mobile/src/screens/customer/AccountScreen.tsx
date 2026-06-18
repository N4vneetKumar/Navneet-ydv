import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Switch, Text, List, IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Address } from '../../types';

export default function CustomerAccountScreen() {
  const { user, refreshUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [notifications, setNotifications] = useState(user?.notification_enabled ?? true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAddresses = useCallback(async () => {
    const { data } = await api.get<Address[]>('/users/me/addresses');
    setAddresses(data);
  }, []);

  useFocusEffect(useCallback(() => {
    loadAddresses();
    if (user) {
      setName(user.name);
      setNotifications(user.notification_enabled);
    }
  }, [loadAddresses, user]));

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me', { name, notification_enabled: notifications });
      await refreshUser();
      Alert.alert('Saved', 'Profile updated');
    } finally {
      setSaving(false);
    }
  };

  const addAddress = async () => {
    if (!newAddress.trim()) return;
    await api.post('/users/me/addresses', {
      label: 'Home',
      address_line: newAddress,
      gps_lat: 28.6139,
      gps_long: 77.209,
      is_default: addresses.length === 0,
    });
    setNewAddress('');
    loadAddresses();
  };

  const deleteAddress = async (id: string) => {
    await api.delete(`/users/me/addresses/${id}`);
    loadAddresses();
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="titleLarge" style={styles.section}>Edit Profile</Text>
      <TextInput label="Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
      <TextInput label="Phone" value={user?.phone} mode="outlined" disabled style={styles.input} />
      <View style={styles.row}>
        <Text>Notifications</Text>
        <Switch value={notifications} onValueChange={setNotifications} />
      </View>
      <Button mode="contained" onPress={saveProfile} loading={saving} style={styles.btn}>Save Profile</Button>

      <Text variant="titleLarge" style={styles.section}>Saved Addresses</Text>
      {addresses.map((addr) => (
        <List.Item
          key={addr.id}
          title={addr.label || 'Address'}
          description={addr.address_line}
          right={() => addr.id ? (
            <IconButton icon="delete" onPress={() => deleteAddress(addr.id!)} />
          ) : null}
        />
      ))}
      <TextInput
        label="New Address"
        value={newAddress}
        onChangeText={setNewAddress}
        mode="outlined"
        style={styles.input}
      />
      <Button mode="outlined" onPress={addAddress} style={styles.btn}>Add Address</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  section: { marginTop: 16, marginBottom: 8, color: '#2E7D32' },
  input: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  btn: { marginBottom: 16 },
});
