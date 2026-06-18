import React, { useEffect } from 'react';
import { View, StyleSheet, SectionList } from 'react-native';
import { Text, List } from 'react-native-paper';
import { useAppStore } from '../../store/appStore';

export default function CustomerPricesScreen() {
  const { rates, fetchRates } = useAppStore();

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const grouped = rates.reduce<Record<string, typeof rates>>((acc, rate) => {
    if (!acc[rate.category]) acc[rate.category] = [];
    acc[rate.category].push(rate);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([title, data]) => ({ title, data }));

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <Text variant="titleMedium" style={styles.category}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <List.Item
            title={item.item_name}
            right={() => <Text style={styles.rate}>₹{item.rate_per_kg}/kg</Text>}
            style={styles.item}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  category: { backgroundColor: '#E8F5E9', padding: 12, color: '#2E7D32', fontWeight: 'bold' },
  item: { borderBottomWidth: 1, borderBottomColor: '#eee' },
  rate: { color: '#2E7D32', fontWeight: 'bold', alignSelf: 'center' },
});
