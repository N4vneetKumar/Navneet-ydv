import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, Text } from 'react-native-paper';

interface Props {
  title: string;
  onMenuPress?: () => void;
  subtitle?: string;
}

export default function ScreenHeader({ title, onMenuPress, subtitle }: Props) {
  return (
    <Appbar.Header style={styles.header} elevated>
      {onMenuPress && <Appbar.Action icon="menu" onPress={onMenuPress} />}
      <Appbar.Content title={title} subtitle={subtitle} />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#2E7D32' },
});
