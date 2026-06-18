import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { Text, Button, TextInput, SegmentedButtons, ProgressBar } from 'react-native-paper';
import MandatoryCamera from '../../../components/camera/MandatoryCamera';
import api from '../../../services/api';
import { getCurrentLocation } from '../../../services/location';
import { Order } from '../../../types';

interface Props {
  order: Order;
  visible: boolean;
  onClose: () => void;
}

const STEPS = ['Weight', 'Amount', 'Scale Photo', 'Vehicle Photo', 'OTP', 'Confirm'];

export default function WeighPayModal({ order, visible, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [weight, setWeight] = useState('');
  const [scalePhoto, setScalePhoto] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const payable = useMemo(() => {
    const w = parseFloat(weight) || 0;
    if (!order.items?.length) return 0;
    const avgRate = order.items.reduce((s, i) => s + i.rate_per_kg, 0) / order.items.length;
    return Math.round(w * avgRate * 100) / 100;
  }, [weight, order.items]);

  const requestOtp = async () => {
    setLoading(true);
    try {
      await api.post(`/orders/${order.id}/request-otp`);
      setOtpRequested(true);
      Alert.alert('OTP Sent', '4-digit OTP sent to customer app (SMS fallback if offline)');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      Alert.alert('Error', msg || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const complete = async () => {
    const loc = await getCurrentLocation();
    if (!loc) {
      Alert.alert('GPS Required', 'Enable location to verify you are at customer address');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/orders/${order.id}/complete`, {
        actual_weight: parseFloat(weight),
        payment_mode: paymentMode,
        scale_photo: scalePhoto,
        vehicle_photo: vehiclePhoto,
        otp,
        boy_lat: loc.lat,
        boy_long: loc.long,
      });
      Alert.alert('Success', 'Order completed!');
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      Alert.alert('Completion Failed', msg || 'Check OTP, photos, and GPS (within 100m)');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (step === 0 && (!weight || parseFloat(weight) <= 0)) {
      Alert.alert('Enter valid weight');
      return;
    }
    if (step === 2 && !scalePhoto) {
      Alert.alert('Take scale photo');
      return;
    }
    if (step === 3 && !vehiclePhoto) {
      Alert.alert('Take vehicle photo');
      return;
    }
    setStep(step + 1);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <ScrollView style={styles.container}>
        <Text variant="titleLarge" style={styles.title}>Weigh & Pay</Text>
        <ProgressBar progress={(step + 1) / STEPS.length} color="#2E7D32" />
        <Text style={styles.stepLabel}>{STEPS[step]}</Text>

        {step === 0 && (
          <TextInput
            label="Actual Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />
        )}

        {step === 1 && (
          <View style={styles.amountBox}>
            <Text variant="headlineMedium">Pay Customer: ₹{payable}</Text>
            <Text variant="bodySmall">Based on {weight}kg × item rates</Text>
          </View>
        )}

        {step === 2 && (
          <MandatoryCamera
            label="Photo 1: Scrap on scale (dial visible)"
            onCapture={setScalePhoto}
          />
        )}

        {step === 3 && (
          <MandatoryCamera
            label="Photo 2: Scrap loaded on vehicle"
            onCapture={setVehiclePhoto}
          />
        )}

        {step === 4 && (
          <>
            <SegmentedButtons
              value={paymentMode}
              onValueChange={setPaymentMode}
              buttons={[{ value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' }]}
              style={styles.segment}
            />
            <Text variant="bodyMedium" style={styles.payHint}>
              Pay customer ₹{payable} physically, then request OTP
            </Text>
            <Button mode="outlined" onPress={requestOtp} loading={loading} disabled={otpRequested}>
              Request OTP
            </Button>
            <TextInput
              label="Enter 4-digit OTP from customer"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={4}
              mode="outlined"
              style={styles.input}
            />
          </>
        )}

        {step === 5 && (
          <View style={styles.summary}>
            <Text>Weight: {weight}kg</Text>
            <Text>Amount: ₹{payable}</Text>
            <Text>Payment: {paymentMode.toUpperCase()}</Text>
            <Text>Photos: ✓ ✓</Text>
            <Text>OTP: {otp}</Text>
            <Button mode="contained" onPress={complete} loading={loading} style={styles.btn}>
              Confirm Collection & Payment
            </Button>
          </View>
        )}

        {step < 5 && (
          <Button mode="contained" onPress={next} style={styles.btn}>Next</Button>
        )}
        <Button onPress={onClose}>Cancel</Button>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 48, backgroundColor: '#fff' },
  title: { color: '#2E7D32', marginBottom: 16 },
  stepLabel: { marginVertical: 12, fontWeight: 'bold' },
  input: { marginVertical: 12 },
  amountBox: { padding: 24, backgroundColor: '#E8F5E9', borderRadius: 8, alignItems: 'center' },
  segment: { marginVertical: 12 },
  payHint: { marginVertical: 8, color: '#666' },
  summary: { gap: 8, marginBottom: 16 },
  btn: { marginVertical: 8 },
});
