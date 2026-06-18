/**
 * Firestore real-time listeners (optional — requires Firebase JS SDK config).
 * Primary data flow uses REST API + polling on focus.
 * Enable by adding @react-native-firebase/app and configuring google-services.json.
 */

export function subscribeToOrders(_customerId: string, _callback: (orders: unknown[]) => void) {
  // Stub: integrate @react-native-firebase/firestore when Firebase client is configured
  return () => {};
}

export function subscribeToRates(_callback: (rates: unknown[]) => void) {
  return () => {};
}
