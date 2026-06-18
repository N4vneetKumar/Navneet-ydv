import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    setError('');
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    try {
      await login(cleaned.length === 10 ? cleaned : cleaned.slice(-10));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Login failed. Use a registered phone number.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>♻ Recycle Me</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Digital scrap pickup — secure & transparent
          </Text>
        </View>

        <TextInput
          label="Mobile Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          mode="outlined"
          left={<TextInput.Affix text="+91" />}
          style={styles.input}
          maxLength={10}
        />
        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Send OTP / Login
        </Button>

        <Text variant="bodySmall" style={styles.hint}>
          Dev mode: enter seed phone (e.g. 9999900001 admin, 9999900002 customer, 9999900004 pickup boy)
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: '#2E7D32', fontWeight: 'bold' },
  subtitle: { color: '#666', textAlign: 'center', marginTop: 8 },
  input: { marginBottom: 8 },
  button: { marginTop: 16, paddingVertical: 4 },
  hint: { marginTop: 24, textAlign: 'center', color: '#999' },
});
