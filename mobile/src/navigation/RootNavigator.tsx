import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import LoginScreen from '../screens/auth/LoginScreen';
import CustomerNavigator from './CustomerNavigator';
import AdminNavigator from './AdminNavigator';
import PickupNavigator from './PickupNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'customer' ? (
          <Stack.Screen name="Customer" component={CustomerNavigator} />
        ) : user.role === 'admin' ? (
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : (
          <Stack.Screen name="Pickup" component={PickupNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
