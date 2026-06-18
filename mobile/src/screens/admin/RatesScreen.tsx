import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, DataTable } from 'react-native-paper';
import api from '../../services/api';
import { Rate } from '../../types';

export default function AdminRatesScreen() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get<Rate[]>('/rates').then(({ data }) => {
      setRates(data);
      const map: Record<string, string> = {};
      data.forEach((r) => { map[r.id] = String(r.rate_per_kg); });
      setEdited(map);
    });
  }, []);

  const save = async () => {
    const payload = rates.map((r) => ({
      id: r.id,
      rate_per_kg: parseFloat(edited[r.id] || String(r.rate_per_kg)),
    }));
    const { data } = await api.patch('/rates', { rates: payload });
    setRates(data);
    alert('Rates updated — reflects on all customer apps');
  };

  return (
    <ScrollView style={styles.container}>
      <DataTable>
        <DataTable.Header>
          <DataTable.Title>Category</DataTable.Title>
          <DataTable.Title>Item</DataTable.Title>
          <DataTable.Title numeric>Rate ₹/kg</DataTable.Title>
        </DataTable.Header>
        {rates.map((rate) => (
          <DataTable.Row key={rate.id}>
            <DataTable.Cell>{rate.category}</DataTable.Cell>
            <DataTable.Cell>{rate.item_name}</DataTable.Cell>
            <DataTable.Cell numeric>
              <TextInput
                value={edited[rate.id]}
                onChangeText={(v) => setEdited({ ...edited, [rate.id]: v })}
                keyboardType="decimal-pad"
                dense
                style={styles.rateInput}
              />
            </DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>
      <Button mode="contained" onPress={save} style={styles.btn}>Update Rates</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  rateInput: { width: 80, backgroundColor: '#f0f0f0' },
  btn: { margin: 16 },
});
