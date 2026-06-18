import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { Order } from '../../types';

export default function PickupNavigateScreen() {
  const [orders, setOrders] = useState<Order[]>([]);

  useFocusEffect(useCallback(async () => {
    const [assigned, inProgress] = await Promise.all([
      api.get<Order[]>('/orders', { params: { status: 'assigned' } }),
      api.get<Order[]>('/orders', { params: { status: 'in_progress' } }),
    ]);
    setOrders([...assigned.data, ...inProgress.data]);
  }, []));

  const region = orders.length
    ? {
        latitude: orders[0].gps_lat,
        longitude: orders[0].gps_long,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : { latitude: 28.6139, longitude: 77.209, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region}>
        {orders.map((o) => (
          <Marker
            key={o.id}
            coordinate={{ latitude: o.gps_lat, longitude: o.gps_long }}
            title={o.customer_name}
            description={o.address?.address_line}
            pinColor="#2E7D32"
          />
        ))}
      </MapView>
      <Text style={styles.legend}>{orders.length} pickup(s) on map today</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  legend: { position: 'absolute', bottom: 16, alignSelf: 'center', backgroundColor: '#fff', padding: 8, borderRadius: 8 },
});
