import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Text } from 'react-native-paper';

interface Props {
  onCapture: (uri: string) => void;
  label: string;
}

export default function MandatoryCamera({ onCapture, label }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [captured, setCaptured] = useState(false);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <Text>Camera permission required (gallery disabled for security)</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.btn}>
          Grant Camera Access
        </Button>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) {
      setCaptured(true);
      onCapture(photo.uri);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {!captured ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <Button mode="contained" onPress={takePhoto} icon="camera" style={styles.btn}>
            Take Photo (Camera Only)
          </Button>
        </>
      ) : (
        <Text style={styles.success}>✓ Photo captured</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  label: { fontWeight: 'bold', marginBottom: 8, color: '#333' },
  camera: { width: '100%', height: 220, borderRadius: 8 },
  btn: { marginTop: 12 },
  success: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
});
