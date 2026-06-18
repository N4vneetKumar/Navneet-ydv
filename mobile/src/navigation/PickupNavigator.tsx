import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import PickupTasksScreen from '../screens/pickup/TasksScreen';
import PickupNavigateScreen from '../screens/pickup/NavigateScreen';
import PickupEarningsScreen from '../screens/pickup/EarningsScreen';
import PickupProfileScreen from '../screens/pickup/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function PickupNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#2E7D32',
        headerStyle: { backgroundColor: '#2E7D32' },
        headerTintColor: '#fff',
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
            'My Tasks': 'truck-delivery',
            Navigate: 'map-marker-path',
            Earnings: 'cash-multiple',
            Profile: 'account-hard-hat',
          };
          return <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="My Tasks" component={PickupTasksScreen} />
      <Tab.Screen name="Navigate" component={PickupNavigateScreen} />
      <Tab.Screen name="Earnings" component={PickupEarningsScreen} />
      <Tab.Screen name="Profile" component={PickupProfileScreen} />
    </Tab.Navigator>
  );
}
