import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Checkbox, TextInput, ProgressBar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { queueOrder } from '../../services/offlineQueue';
import { getCurrentLocation } from '../../services/location';
import { TIME_SLOTS } from '../../theme';
import { OrderItem, Address } from '../../types';

export default function RaisePickupScreen() {
  const navigation = useNavigation<any>();
  const { rates, fetchRates } = useAppStore();
  const { refreshUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<OrderItem[]>([]);
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('9-12');
  const [addressLine, setAddressLine] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => { fetchRates(); }, [fetchRates]);

  const toggleItem = (rate: typeof rates[0]) => {
    const exists = selected.find((s) => s.id === rate.id);
    if (exists) {
      setSelected(selected.filter((s) => s.id !== rate.id));
    } else {
      setSelected([...selected, {
        id: rate.id,
        item_name: rate.item_name,
        category: rate.category,
        rate_per_kg: rate.rate_per_kg,
      }]);
    }
  };

  const confirmOrder = async () => {
    if (!addressLine.trim()) {
      Alert.alert('Error', 'Please enter an address');
      return;
    }
    setLoading(true);
    const loc = await getCurrentLocation();
    const address: Address = {
      address_line: addressLine,
      gps_lat: loc?.lat || 28.6139,
      gps_long: loc?.long || 77.209,
    };

    const payload = {
      items: selected,
      estimated_weight: parseFloat(estimatedWeight) || 5,
      pickup_date: pickupDate,
      pickup_time_slot: timeSlot,
      address,
      gps_lat: address.gps_lat,
      gps_long: address.gps_long,
    };

    try {
      await api.post('/orders', payload);
      await refreshUser();
      setStep(2);
    } catch {
      await queueOrder(payload);
      Alert.alert('Offline', 'Order saved locally. Will sync when online.');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <View style={styles.success}>
        <Text variant="headlineMedium" style={styles.successText}>Pickup Request Raised!</Text>
        <Text variant="bodyLarge">Your order appears in the Pending tab.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.btn}>
          Done
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ProgressBar progress={(step + 1) / 2} color="#2E7D32" style={styles.progress} />
      <Text variant="titleMedium" style={styles.stepTitle}>
        Step {step + 1}: {step === 0 ? 'Select Items' : 'Schedule Pickup'}
      </Text>

      {step === 0 && (
        <>
          {rates.map((rate) => (
            <View key={rate.id} style={styles.checkRow}>
              <Checkbox
                status={selected.some((s) => s.id === rate.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleItem(rate)}
              />
              <Text style={styles.checkLabel}>{rate.item_name} — ₹{rate.rate_per_kg}/kg</Text>
            </View>
          ))}
          <TextInput
            label="Estimated Weight (kg)"
            value={estimatedWeight}
            onChangeText={setEstimatedWeight}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />
          <Button
            mode="contained"
            disabled={selected.length === 0}
            onPress={() => setStep(1)}
            style={styles.btn}
          >
            Next →
          </Button>
        </>
      )}

      {step === 1 && (
        <>
          <TextInput label="Pickup Date (YYYY-MM-DD)" value={pickupDate} onChangeText={setPickupDate} mode="outlined" style={styles.input} />
          {TIME_SLOTS.map((slot) => (
            <Button
              key={slot.value}
              mode={timeSlot === slot.value ? 'contained' : 'outlined'}
              onPress={() => setTimeSlot(slot.value)}
              style={styles.slotBtn}
            >
              {slot.label}
            </Button>
          ))}
          <TextInput label="Address" value={addressLine} onChangeText={setAddressLine} mode="outlined" multiline style={styles.input} />
          <Button mode="contained" onPress={confirmOrder} loading={loading} style={styles.btn}>
            Confirm Order
          </Button>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  progress: { marginBottom: 16 },
  stepTitle: { marginBottom: 16, color: '#2E7D32' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  checkLabel: { flex: 1 },
  input: { marginBottom: 12 },
  btn: { marginTop: 16 },
  slotBtn: { marginBottom: 8 },
  success: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successText: { color: '#2E7D32', marginBottom: 16 },
});
