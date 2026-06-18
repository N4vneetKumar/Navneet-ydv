import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2E7D32',
    primaryContainer: '#C8E6C9',
    secondary: '#558B2F',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    error: '#D32F2F',
    onPrimary: '#FFFFFF',
  },
};

export const TIME_SLOTS = [
  { label: 'Morning (9 AM - 12 PM)', value: '9-12' },
  { label: 'Afternoon (12 PM - 3 PM)', value: '12-3' },
  { label: 'Evening (3 PM - 6 PM)', value: '3-6' },
];

export const WHATSAPP_NUMBER = '919999000000';
