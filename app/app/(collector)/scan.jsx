// filepath: app/app/(collector)/scan.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
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

const OUTCOMES = {
  SEGREGATED: 'SEGREGATED',
  MIXED: 'MIXED',
  NO_HANDOVER: 'NO_HANDOVER',
};

export default function CollectorScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPerm, setLocationPerm] = useState(null);

  // Flow state
  const [step, setStep] = useState(STEPS.SCANNING);
  const [scannedQR, setScannedQR] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [resolvingHousehold, setResolvingHousehold] = useState(false);
  const [resolvedHousehold, setResolvedHousehold] = useState(null);

  // Form state
  const [outcome, setOutcome] = useState(OUTCOMES.SEGREGATED);
  const [wasteWeight, setWasteWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [requestId, setRequestId] = useState(() => `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

  // Result state
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPerm(status === 'granted');
      } catch (error) {
        console.warn('Location request error:', error.message);
        setLocationPerm(false);
      }
    })();
  }, []);

  // If householdId was passed from Round Screen, resolve it directly
  useEffect(() => {
    if (params.householdId) {
      handleResolveHousehold(params.householdId, params.initialOutcome);
    }
  }, [params.householdId, params.initialOutcome]);

  const handleResolveHousehold = async (idOrQr, initialOutcome) => {
    setResolvingHousehold(true);
    setValidationError(null);
    try {
      const res = await api.resolveHousehold(idOrQr);
      if (res.data?.success && res.data?.data?.household) {
        const hh = res.data.data.household;
        setResolvedHousehold(hh);
        setScannedQR(hh.qrCode);
        if (initialOutcome && OUTCOMES[initialOutcome]) {
          setOutcome(initialOutcome);
        } else {
          setOutcome(OUTCOMES.SEGREGATED);
        }
        setStep(STEPS.DETAILS);
      } else {
        Alert.alert('Household Error', 'Could not resolve household details in your assigned society.');
      }
    } catch (err) {
      Alert.alert(
        'Resolution Error',
        err.response?.data?.message || 'Failed to verify household in your assigned society.'
      );
    } finally {
      setResolvingHousehold(false);
    }
  };

  // --- Step 1: QR Scan ---
  const handleBarCodeScanned = ({ data }) => {
    if (scanned || resolvingHousehold) return;
    setScanned(true);

    if (!data || !data.startsWith('GP-HH-')) {
      setScanResult({
        success: false,
        message: 'Invalid QR Code. Please scan a valid GreenPoint household QR sticker.'
      });
      setStep(STEPS.RESULT);
      return;
    }

    setScannedQR(data);
    handleResolveHousehold(data, null);
  };

  const handleTestMode = () => {
    handleBarCodeScanned({ data: 'GP-HH-UUV9E8GPMY' });
  };

  // --- Step 2: Form submission ---
  const handleSubmit = async () => {
    setValidationError(null);

    // Validate required notes for non-segregated outcomes
    if ((outcome === OUTCOMES.MIXED || outcome === OUTCOMES.NO_HANDOVER) && (!notes || !notes.trim())) {
      const fieldName = outcome === OUTCOMES.MIXED ? 'Mixed waste / Needs improvement' : 'No handover';
      setValidationError(`An explanatory note is required when recording ${fieldName}.`);
      return;
    }

    setSubmitting(true);
    try {
      let location = null;
      if (locationPerm) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          location = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        } catch (locErr) {
          console.log('Location fetch skipped:', locErr.message);
        }
      }

      const payload = {
        qrCode: scannedQR || resolvedHousehold?.qrCode,
        householdId: resolvedHousehold?._id,
        outcome,
        notes: notes.trim(),
        weightKg: outcome === OUTCOMES.NO_HANDOVER ? 0 : (wasteWeight ? parseFloat(wasteWeight) : null),
        weightBasis: 'ESTIMATED',
        location,
        requestId
      };

      const res = await api.collectorScan(payload);
      setScanResult(res.data);
      setStep(STEPS.RESULT);
    } catch (err) {
      console.error('Inspection submit error:', err);
      const resData = err.response?.data;
      setScanResult({
        success: false,
        message: resData?.message || 'Submission failed. Please check connection and try again.',
        data: resData?.data || null
      });
      setStep(STEPS.RESULT);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Reset for Next Scan ---
  const resetScanner = () => {
    setScanned(false);
    setScannedQR(null);
    setResolvedHousehold(null);
    setStep(STEPS.SCANNING);
    setOutcome(OUTCOMES.SEGREGATED);
    setWasteWeight('');
    setNotes('');
    setValidationError(null);
    setScanResult(null);
    setRequestId(`req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  };

  const goBackToRound = () => {
    router.replace('/(collector)/round');
  };

  // ============================
  // RENDER PERMISSION DENIAL
  // ============================
  if (!permission) return <View style={styles.container} />;

  if (!permission.granted && step === STEPS.SCANNING) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#6b7280" style={{ marginBottom: 16 }} />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          Camera access is used to scan household QR codes. You can grant access or use the assigned household round list.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fallbackRoundBtn} onPress={goBackToRound}>
          <Text style={styles.fallbackRoundBtnText}>Use Assigned Household List</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ============================
  // MAIN RENDER
  // ============================
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity 
          onPress={step === STEPS.DETAILS ? resetScanner : goBackToRound} 
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === STEPS.SCANNING ? 'Scan Household QR' : step === STEPS.DETAILS ? 'Household Inspection' : 'Receipt'}
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
              Scan the approved QR sticker on the household door or bin
            </Text>

            {resolvingHousehold && (
              <View style={styles.resolvingBox}>
                <ActivityIndicator size="small" color="#16a34a" />
                <Text style={styles.resolvingText}>Verifying household membership...</Text>
              </View>
            )}

            <View style={styles.scannerActions}>
              <TouchableOpacity style={styles.testBtn} onPress={handleTestMode}>
                <Text style={styles.testBtnText}>Use Test QR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roundListBtn} onPress={goBackToRound}>
                <MaterialCommunityIcons name="format-list-checks" size={16} color="#fff" />
                <Text style={styles.roundListBtnText}>Select from Round</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ---- STEP 2: Structured Inspection Details Form ---- */}
      {step === STEPS.DETAILS && (
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Household Identity Confirmation Card */}
            <View style={styles.identityCard}>
              <View style={styles.identityHeader}>
                <MaterialCommunityIcons name="home-check" size={24} color="#16a34a" />
                <Text style={styles.identityTitle}>Confirmed Household</Text>
              </View>
              <Text style={styles.citizenNameText}>{resolvedHousehold?.citizenName || 'Resident'}</Text>
              <Text style={styles.householdAddressText}>{resolvedHousehold?.address || 'Society Household'}</Text>
              <View style={styles.identityMetaRow}>
                <Text style={styles.societyBadgeText}>🏢 {resolvedHousehold?.societyName || 'Assigned Society'}</Text>
                <Text style={styles.qrBadgeText}>{scannedQR || resolvedHousehold?.qrCode}</Text>
              </View>
            </View>

            {/* Structured Outcome Selection */}
            <Text style={styles.formLabel}>Household Handover Outcome *</Text>
            
            {/* 1. SEGREGATED */}
            <TouchableOpacity
              style={[styles.outcomeOption, outcome === OUTCOMES.SEGREGATED && styles.outcomeOptionActiveGreen]}
              onPress={() => { setOutcome(OUTCOMES.SEGREGATED); setValidationError(null); }}
            >
              <MaterialCommunityIcons 
                name="check-circle" 
                size={24} 
                color={outcome === OUTCOMES.SEGREGATED ? '#16a34a' : '#9ca3af'} 
              />
              <View style={styles.outcomeTextContainer}>
                <Text style={[styles.outcomeTitle, outcome === OUTCOMES.SEGREGATED && styles.outcomeTitleActiveGreen]}>
                  Segregated Handover
                </Text>
                <Text style={styles.outcomeSubtitle}>
                  Dry and wet waste properly separated. Clean participation recorded.
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. MIXED / NEEDS IMPROVEMENT */}
            <TouchableOpacity
              style={[styles.outcomeOption, outcome === OUTCOMES.MIXED && styles.outcomeOptionActiveAmber]}
              onPress={() => { setOutcome(OUTCOMES.MIXED); setValidationError(null); }}
            >
              <MaterialCommunityIcons 
                name="alert-circle" 
                size={24} 
                color={outcome === OUTCOMES.MIXED ? '#d97706' : '#9ca3af'} 
              />
              <View style={styles.outcomeTextContainer}>
                <Text style={[styles.outcomeTitle, outcome === OUTCOMES.MIXED && styles.outcomeTitleActiveAmber]}>
                  Mixed / Needs Improvement
                </Text>
                <Text style={styles.outcomeSubtitle}>
                  Waste was unsegregated or contaminated. Note is required. No fines issued.
                </Text>
              </View>
            </TouchableOpacity>

            {/* 3. NO HANDOVER */}
            <TouchableOpacity
              style={[styles.outcomeOption, outcome === OUTCOMES.NO_HANDOVER && styles.outcomeOptionActiveGray]}
              onPress={() => { setOutcome(OUTCOMES.NO_HANDOVER); setValidationError(null); }}
            >
              <MaterialCommunityIcons 
                name="door-closed" 
                size={24} 
                color={outcome === OUTCOMES.NO_HANDOVER ? '#4b5563' : '#9ca3af'} 
              />
              <View style={styles.outcomeTextContainer}>
                <Text style={[styles.outcomeTitle, outcome === OUTCOMES.NO_HANDOVER && styles.outcomeTitleActiveGray]}>
                  No Handover / Absent
                </Text>
                <Text style={styles.outcomeSubtitle}>
                  Door locked, no waste handed over. Reason is required.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Notes Section (Required for Mixed & No Handover) */}
            <View style={styles.labelRow}>
              <Text style={styles.formLabel}>
                {outcome === OUTCOMES.SEGREGATED ? 'Observation Notes (Optional)' : 'Explanatory Note / Reason *'}
              </Text>
              {outcome !== OUTCOMES.SEGREGATED && (
                <Text style={styles.requiredTag}>Required</Text>
              )}
            </View>
            <TextInput
              style={[
                styles.input, 
                { height: 80, textAlignVertical: 'top' },
                outcome !== OUTCOMES.SEGREGATED && !notes && styles.inputWarning
              ]}
              placeholder={
                outcome === OUTCOMES.MIXED
                  ? "e.g., Plastic mixed inside wet waste container; resident requested guidance..."
                  : outcome === OUTCOMES.NO_HANDOVER
                  ? "e.g., Door locked, resident traveling, no bin outside..."
                  : "e.g., Neatly bundled cardboard and segregated wet compostables..."
              }
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={(text) => { setNotes(text); setValidationError(null); }}
            />

            {/* Optional Weight (Disabled for No Handover) */}
            <Text style={styles.formLabel}>
              Approximate Weight (kg) {outcome === OUTCOMES.NO_HANDOVER ? '(Not applicable)' : '(Optional)'}
            </Text>
            <TextInput
              style={[styles.input, outcome === OUTCOMES.NO_HANDOVER && styles.inputDisabled]}
              placeholder={outcome === OUTCOMES.NO_HANDOVER ? "0 kg (No handover)" : "e.g., 2.5 (Estimated)"}
              keyboardType="decimal-pad"
              editable={outcome !== OUTCOMES.NO_HANDOVER}
              value={outcome === OUTCOMES.NO_HANDOVER ? '' : wasteWeight}
              onChangeText={setWasteWeight}
            />

            {/* Validation Error Alert */}
            {validationError ? (
              <View style={styles.validationErrorBox}>
                <MaterialCommunityIcons name="alert" size={16} color="#dc2626" />
                <Text style={styles.validationErrorText}>{validationError}</Text>
              </View>
            ) : null}

            {/* Notice */}
            <View style={styles.policyNoticeBox}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color="#15803d" />
              <Text style={styles.policyNoticeText}>
                Household inspections record participation only. No personal points or automatic fines are generated.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  Save Household Inspection
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ---- STEP 3: Saved Receipt / Result ---- */}
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 24 
  },
  permissionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  permissionText: { textAlign: 'center', fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  permissionBtn: { backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10, width: '100%', alignItems: 'center' },
  permissionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  fallbackRoundBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  fallbackRoundBtnText: { color: '#16a34a', fontWeight: '600', fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#16a34a', paddingHorizontal: 16, paddingVertical: 12, zIndex: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Camera Overlay
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  frame: { width: 250, height: 250, borderWidth: 2, borderColor: '#16a34a', backgroundColor: 'transparent', marginBottom: 24, borderRadius: 12 },
  instructionText: {
    color: '#fff', fontSize: 15, textAlign: 'center', paddingHorizontal: 40,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
    marginBottom: 20,
  },
  resolvingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  resolvingText: { fontSize: 13, color: '#1f2937', fontWeight: '600' },
  scannerActions: { flexDirection: 'row', gap: 12 },
  testBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fff' },
  testBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  roundListBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#16a34a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  roundListBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Form styles
  formContainer: { flex: 1, padding: 16 },
  identityCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  identityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  identityTitle: { fontSize: 13, fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' },
  citizenNameText: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  householdAddressText: { fontSize: 14, color: '#475569', marginTop: 2 },
  identityMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  societyBadgeText: { fontSize: 12, backgroundColor: '#f1f5f9', color: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontWeight: '600' },
  qrBadgeText: { fontSize: 12, backgroundColor: '#f0fdf4', color: '#166534', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontWeight: '600' },

  formLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8, marginTop: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  requiredTag: { fontSize: 11, fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' },

  outcomeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  outcomeOptionActiveGreen: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  outcomeOptionActiveAmber: { borderColor: '#d97706', backgroundColor: '#fffbeb' },
  outcomeOptionActiveGray: { borderColor: '#4b5563', backgroundColor: '#f8fafc' },
  outcomeTextContainer: { flex: 1 },
  outcomeTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  outcomeTitleActiveGreen: { color: '#15803d' },
  outcomeTitleActiveAmber: { color: '#b45309' },
  outcomeTitleActiveGray: { color: '#374151' },
  outcomeSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 16 },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 12,
  },
  inputWarning: { borderColor: '#f59e0b' },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },

  validationErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 12,
  },
  validationErrorText: { fontSize: 13, color: '#b91c1c', flex: 1, fontWeight: '600' },

  policyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 18,
  },
  policyNoticeText: { fontSize: 12, color: '#1e40af', flex: 1, lineHeight: 17 },

  submitBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitBtnDisabled: { backgroundColor: '#94a3b8', elevation: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
