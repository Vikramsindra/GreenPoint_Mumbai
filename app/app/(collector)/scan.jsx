// filepath: app/app/(collector)/scan.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Image, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as api from '../../services/api';
import CollectorScanResult from '../../components/CollectorScanResult';
import { SafeAreaView } from 'react-native-safe-area-context';

const STEPS = {
  SCANNING: 'scanning',
  DETAILS: 'details',
  RESULT: 'result',
};

export default function CollectorScanScreen() {
  const router = useRouter();
  const { householdId } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPerm, setLocationPerm] = useState(null);

  // Flow state
  const [step, setStep] = useState(STEPS.SCANNING);
  const [scannedQR, setScannedQR] = useState(null);
  const [scanned, setScanned] = useState(false);

  // Details form
  const [isSegregated, setIsSegregated] = useState(true);
  const [wasteWeight, setWasteWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Result
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPerm(status === 'granted');
    })();
  }, []);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Step 1: QR Scan ---
  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    if (!data.startsWith('GP-HH-')) {
      setScanResult({ success: false, message: 'Invalid QR Code. Please scan a valid GreenPoint household QR.' });
      setStep(STEPS.RESULT);
      return;
    }

    setScannedQR(data);
    setStep(STEPS.DETAILS);
  };

  const handleTestMode = () => {
    handleBarCodeScanned({ type: 'qr', data: 'GP-HH-UUV9E8GPMY' });
  };

  // --- Step 2: Photo Capture ---
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });

    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });

    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // --- Step 3: Submit ---
  const handleSubmit = async () => {
    if (!photoUri) {
      Alert.alert('Photo Required', 'Please take a photo of the collected waste before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      let location = null;
      if (locationPerm) {
        const loc = await Location.getCurrentPositionAsync({});
        location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }

      const noteText = [
        `Segregated: ${isSegregated ? 'Yes' : 'No'}`,
        wasteWeight ? `Weight: ${wasteWeight} kg` : '',
        notes ? `Notes: ${notes}` : '',
        'Photo attached'
      ].filter(Boolean).join(' | ');

      const res = await api.collectorScan(scannedQR, location, noteText);
      setScanResult(res.data);
      setStep(STEPS.RESULT);
    } catch (err) {
      console.error(err);
      setScanResult({
        success: false,
        message: err.response?.data?.message || 'Scan failed. Please check your connection and try again.'
      });
      setStep(STEPS.RESULT);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Reset ---
  const resetScanner = () => {
    setScanned(false);
    setScannedQR(null);
    setStep(STEPS.SCANNING);
    setIsSegregated(true);
    setWasteWeight('');
    setNotes('');
    setPhotoUri(null);
    setScanResult(null);
  };

  const goBackToRound = () => {
    router.replace('/(collector)/round');
  };

  // ============================
  // RENDER
  // ============================

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity onPress={step === STEPS.DETAILS ? resetScanner : goBackToRound} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === STEPS.SCANNING ? 'Scan Household QR' : step === STEPS.DETAILS ? 'Collection Details' : 'Result'}
        </Text>
        <View style={{ width: 24 }} />
      </SafeAreaView>

      {/* ---- STEP 1: Camera Scanner ---- */}
      {step === STEPS.SCANNING && (
        <View style={{ flex: 1 }}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
          <View style={styles.overlay}>
            <View style={styles.frame} />
            <Text style={styles.instructionText}>
              Scan the QR sticker on the household bin or door
            </Text>

            {!locationPerm && (
              <View style={styles.warningBox}>
                <MaterialCommunityIcons name="alert" size={16} color="#d97706" />
                <Text style={styles.warningText}>Location permission needed for verification.</Text>
              </View>
            )}

            <TouchableOpacity style={styles.testBtn} onPress={handleTestMode}>
              <Text style={styles.testBtnText}>Use Test QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ---- STEP 2: Collection Details Form ---- */}
      {step === STEPS.DETAILS && (
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* QR Badge */}
            <View style={styles.qrBadge}>
              <MaterialCommunityIcons name="qrcode-scan" size={20} color="#16a34a" />
              <Text style={styles.qrBadgeText}>{scannedQR}</Text>
              <MaterialCommunityIcons name="check-circle" size={18} color="#16a34a" />
            </View>

            {/* Segregation Status */}
            <Text style={styles.formLabel}>Segregation Status *</Text>
            <View style={styles.segRow}>
              <TouchableOpacity
                style={[styles.segBtn, isSegregated && styles.segBtnActiveGreen]}
                onPress={() => setIsSegregated(true)}
              >
                <MaterialCommunityIcons 
                  name="check-circle" size={22} 
                  color={isSegregated ? '#fff' : '#16a34a'} 
                />
                <Text style={[styles.segBtnText, isSegregated && styles.segBtnTextActive]}>
                  Properly Segregated
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segBtn, !isSegregated && styles.segBtnActiveRed]}
                onPress={() => setIsSegregated(false)}
              >
                <MaterialCommunityIcons 
                  name="close-circle" size={22} 
                  color={!isSegregated ? '#fff' : '#dc2626'} 
                />
                <Text style={[styles.segBtnText, !isSegregated && styles.segBtnTextActive]}>
                  Not Segregated
                </Text>
              </TouchableOpacity>
            </View>

            {/* Weight */}
            <Text style={styles.formLabel}>Approximate Weight (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2.5"
              keyboardType="decimal-pad"
              value={wasteWeight}
              onChangeText={setWasteWeight}
            />

            {/* Notes */}
            <Text style={styles.formLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Any additional observations..."
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            {/* Photo Section */}
            <Text style={styles.formLabel}>Photo of Collected Waste *</Text>
            {photoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}>
                    <MaterialCommunityIcons name="camera-retake" size={18} color="#16a34a" />
                    <Text style={styles.retakeBtnText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => setPhotoUri(null)}>
                    <MaterialCommunityIcons name="delete" size={18} color="#dc2626" />
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.photoButtonsRow}>
                <TouchableOpacity style={styles.photoCaptureBtn} onPress={takePhoto}>
                  <MaterialCommunityIcons name="camera" size={32} color="#16a34a" />
                  <Text style={styles.photoCaptureText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoGalleryBtn} onPress={pickFromGallery}>
                  <MaterialCommunityIcons name="image" size={32} color="#6b7280" />
                  <Text style={styles.photoGalleryText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Submitting...' : isSegregated ? 'Verify & Award Points' : 'Submit Violation'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ---- STEP 3: Result ---- */}
      {step === STEPS.RESULT && (
        <CollectorScanResult
          visible={true}
          result={scanResult}
          onScanNext={resetScanner}
          onGoToRound={goBackToRound}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 },
  permissionText: { textAlign: 'center', fontSize: 16, marginBottom: 20 },
  permissionBtn: { backgroundColor: '#16a34a', padding: 14, borderRadius: 8 },
  permissionBtnText: { color: '#fff', fontWeight: 'bold' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#16a34a', paddingHorizontal: 16, paddingVertical: 12, zIndex: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Camera
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  frame: { width: 250, height: 250, borderWidth: 2, borderColor: '#16a34a', backgroundColor: 'transparent', marginBottom: 30 },
  instructionText: {
    color: '#fff', fontSize: 16, textAlign: 'center', paddingHorizontal: 40,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
  },
  warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', padding: 8, borderRadius: 8, marginTop: 20 },
  warningText: { color: '#d97706', fontSize: 12, marginLeft: 6 },
  testBtn: { marginTop: 40, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fff' },
  testBtnText: { color: '#fff' },

  // Form
  formContainer: { flex: 1, padding: 20, backgroundColor: '#f3f4f6' },
  qrBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 10, padding: 12, marginBottom: 24,
  },
  qrBadgeText: { flex: 1, fontFamily: 'monospace', fontSize: 14, color: '#15803d', fontWeight: '600' },

  formLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },

  segRow: { flexDirection: 'row', gap: 10 },
  segBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  segBtnActiveGreen: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  segBtnActiveRed: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  segBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  segBtnTextActive: { color: '#fff' },

  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1f2937',
  },

  // Photo
  photoButtonsRow: { flexDirection: 'row', gap: 12 },
  photoCaptureBtn: {
    flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 24,
    backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: '#bbf7d0', borderRadius: 12, borderStyle: 'dashed',
  },
  photoCaptureText: { fontSize: 14, fontWeight: '600', color: '#16a34a', marginTop: 6 },
  photoGalleryBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24,
    backgroundColor: '#f9fafb', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, borderStyle: 'dashed',
  },
  photoGalleryText: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginTop: 6 },

  photoPreviewContainer: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  photoPreview: { width: '100%', height: 200, borderRadius: 12 },
  photoActions: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 12 },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retakeBtnText: { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },

  submitBtn: {
    backgroundColor: '#16a34a', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
