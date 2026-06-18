import * as Location from 'expo-location';

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<{ lat: number; long: number } | null> {
  const granted = await requestLocationPermission();
  if (!granted) return null;

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return { lat: loc.coords.latitude, long: loc.coords.longitude };
}

export function openMapsNavigation(lat: number, long: number, label?: string) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${long}&destination_place_id=${encodeURIComponent(label || '')}`;
  return url;
}
