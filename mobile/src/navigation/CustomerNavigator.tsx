import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';

import CustomerHomeScreen from '../screens/customer/HomeScreen';
import CustomerOrdersScreen from '../screens/customer/OrdersScreen';
import CustomerPricesScreen from '../screens/customer/PricesScreen';
import CustomerAccountScreen from '../screens/customer/AccountScreen';
import RaisePickupScreen from '../screens/customer/RaisePickupFlow/RaisePickupScreen';
import { useAuthStore } from '../store/authStore';
import { WHATSAPP_NUMBER } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#2E7D32',
        headerStyle: { backgroundColor: '#2E7D32' },
        headerTintColor: '#fff',
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
            Home: 'home',
            Orders: 'clipboard-list',
            Prices: 'currency-inr',
            Account: 'account',
          };
          return <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={CustomerHomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Orders" component={CustomerOrdersScreen} />
      <Tab.Screen name="Prices" component={CustomerPricesScreen} />
      <Tab.Screen name="Account" component={CustomerAccountScreen} />
    </Tab.Navigator>
  );
}

function CustomerDrawerContent(props: any) {
  const { logout } = useAuthStore();
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItem label="Home" onPress={() => props.navigation.navigate('CustomerMain')} />
      <DrawerItem label="Order History" onPress={() => props.navigation.navigate('CustomerMain', { screen: 'Orders' })} />
      <DrawerItem label="My Account" onPress={() => props.navigation.navigate('CustomerMain', { screen: 'Account' })} />
      <DrawerItem label="Privacy Policy" onPress={() => Linking.openURL('https://recycleme.app/privacy')} />
      <DrawerItem label="WhatsApp Support" onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`)} />
      <DrawerItem label="Logout" onPress={logout} />
    </DrawerContentScrollView>
  );
}

export default function CustomerNavigator() {
  return (
    <Drawer.Navigator drawerContent={(props) => <CustomerDrawerContent {...props} />}>
      <Drawer.Screen name="CustomerMain" component={CustomerTabs} options={{ headerShown: false }} />
      <Drawer.Screen name="RaisePickup" component={RaisePickupScreen} options={{ title: 'Raise Pickup Request' }} />
    </Drawer.Navigator>
  );
}
