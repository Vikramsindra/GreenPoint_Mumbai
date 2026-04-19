import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Image, Linking, Modal, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { usePointsStore } from '../../store/pointsStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import ScanSuccessOverlay from '../../components/ScanSuccessOverlay';
import * as api from '../../services/api';
import { COLORS, SPACING, SHADOW, RADIUS } from '../../constants/theme';

export default function ScanScreen() {
  const { user } = useAuthStore();
  const { openMenu } = useUiStore();
  const isCitizen = user?.role === 'citizen' || !user?.role;

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [selectedAction, setSelectedAction] = useState('SEGREGATION');
  const [overlayState, setOverlayState] = useState(false);
  const [overlayData, setOverlayData] = useState(null); 
  const refreshPoints = usePointsStore(s => s.refresh);

  // Form State
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [scannedCitizenId, setScannedCitizenId] = useState('');
  const [isProperlySegregated, setIsProperlySegregated] = useState(true);
  const [wasteAmount, setWasteAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actions = [
    { id: 'SEGREGATION', label: 'Segregation +10pts' },
    { id: 'COMPOSTING', label: 'Composting +20pts' },
    { id: 'RECYCLABLE_DROP', label: 'Recyclable +5pts' }
  ];

  useEffect(() => {
    if (!isCitizen) {
      const getPermissions = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      };
      getPermissions();
    }
  }, [isCitizen]);

  const handleScan = async (data) => {
    if (scanned || overlayState || formModalVisible) return;
    setScanned(true);
    setScannedCitizenId(data);
    
    // Reset form
    setIsProperlySegregated(true);
    setWasteAmount('');
    setNotes('');
    
    // Open the form instead of immediately hitting the API
    setFormModalVisible(true);
  };

  const submitCollectionForm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const res = await api.scanQR(scannedCitizenId, selectedAction, {
        isSegregated: isProperlySegregated,
        amount: wasteAmount,
        notes: notes
      });
      
      setFormModalVisible(false);
      setOverlayData({ type: 'success', points: res.data.pointsEarned, newBalance: res.data.newBalance, message: res.message });
      setOverlayState(true);
      refreshPoints();
    } catch (e) {
      if (e.response?.status === 409) {
        setFormModalVisible(false);
        setOverlayData({ type: 'duplicate' });
        setOverlayState(true);
      } else {
        alert('Collection failed: ' + (e.response?.data?.message || e.message));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelScan = () => {
    setFormModalVisible(false);
    setTimeout(() => setScanned(false), 1000);
  };

  const onOverlayDismiss = () => {
    setOverlayState(false);
    setTimeout(() => setScanned(false), 1000);
  };

  const downloadQR = async (url) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Storage permission is required to save the QR code.');
        return;
      }
      
      const filename = `GreenPoint_QR_${user?._id?.substring(0, 8) || 'User'}.png`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
      
      alert('QR Code saved successfully to your gallery!');
    } catch (error) {
      alert('Failed to save QR Code: ' + error.message);
    }
  };

  // -----------------------------------------
  // CITIZEN VIEW: Show their personal QR Code
  // -----------------------------------------
  if (isCitizen) {
    const qrData = user?._id ? user._id : 'NO_ID_AVAILABLE';
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrData)}&margin=20`;

    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <LinearGradient colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]} style={styles.gradientHeader}>
          <SafeAreaView edges={['top']}>
            
            <View style={styles.appBar}>
              <TouchableOpacity style={styles.appBarIcon} onPress={openMenu}>
                <Ionicons name="menu-outline" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Ionicons name="leaf" size={20} color={COLORS.white} style={{marginRight: 6}} />
                <Text style={[styles.logoText, {color: COLORS.white}]}>Green<Text style={{color: COLORS.white}}>Point</Text></Text>
              </View>
              <TouchableOpacity style={styles.appBarIcon}>
                 <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.citizenHeader}>
              <Text style={styles.citizenTitle}>My QR Code</Text>
              <Text style={styles.citizenSubtitle}>Show this to the collector to earn points</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.citizenContent}>
          <View style={styles.qrCard}>
            <View style={styles.qrImageWrapper}>
              <Image 
                source={{ uri: qrImageUrl }} 
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.qrUserDetails}>
              <Text style={styles.qrHelperText}>{user?.name}</Text>
              <Text style={styles.qrUserId}>ID: {user?._id?.substring(0, 10).toUpperCase()}</Text>
            </View>
            
            <TouchableOpacity style={styles.downloadBtn} onPress={() => downloadQR(qrImageUrl)}>
              <Ionicons name="download-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.downloadBtnText}>Save QR Code</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.citizenInfoBox}>
            <View style={styles.iconCircle}>
              <Ionicons name="scan-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.citizenInfoText}>
              Keep your waste segregated properly to earn maximum GreenPoints at pickup.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // -----------------------------------------
  // COLLECTOR VIEW: Show Camera Scanner
  // -----------------------------------------
  if (hasPermission === null) {
    return <View style={styles.container} />;
  }
  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📷</Text>
        <Text style={{ fontSize: 16, marginBottom: 16 }}>Camera permission required</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={() => Camera.requestCameraPermissionsAsync().then(r => setHasPermission(r.status === 'granted'))}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : ({ data }) => handleScan(data)}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      
      <SafeAreaView style={styles.overlayWrapper} edges={['top']}>
        <View style={styles.headerBar}>
          <Text style={styles.headerText}>Scan to Award Points</Text>
        </View>

        <View style={styles.frameContainer}>
          <View style={styles.frame} />
          <Text style={styles.instructionText}>Point camera at Citizen's QR code</Text>
        </View>

        <View style={styles.bottomSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
            {actions.map(a => (
              <TouchableOpacity 
                key={a.id} 
                style={[styles.chip, selectedAction === a.id && styles.chipActive]}
                onPress={() => setSelectedAction(a.id)}
              >
                <Text style={[styles.chipText, selectedAction === a.id && styles.chipTextActive]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Collector Form Modal */}
      <Modal visible={formModalVisible} transparent={true} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Collection Details</Text>
              <TouchableOpacity onPress={cancelScan}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.scannedIdText}>Citizen ID: {scannedCitizenId.substring(0, 10).toUpperCase()}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Properly Segregated?</Text>
              <Switch 
                value={isProperlySegregated} 
                onValueChange={setIsProperlySegregated}
                trackColor={{ false: '#d1d5db', true: COLORS.primaryLight }}
                thumbColor={isProperlySegregated ? COLORS.primary : '#9ca3af'}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Amount of Waste (kg)</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 5"
                keyboardType="numeric"
                value={wasteAmount}
                onChangeText={setWasteAmount}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes (Optional)</Text>
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Any observations?"
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
              onPress={submitCollectionForm}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>{isSubmitting ? 'Submitting...' : 'Submit & Award Points'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {overlayState && (
        <ScanSuccessOverlay 
          visible={overlayState} 
          type={overlayData?.type} 
          points={overlayData?.points} 
          newBalance={overlayData?.newBalance} 
          message={overlayData?.message}
          onDismiss={onOverlayDismiss} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Collector Scanner Styles
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  permissionBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8 },
  overlayWrapper: { flex: 1, justifyContent: 'space-between' },
  headerBar: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, alignItems: 'center' },
  headerText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  frameContainer: { alignItems: 'center' },
  frame: { width: 250, height: 250, borderWidth: 2, borderColor: COLORS.white, backgroundColor: 'transparent' },
  instructionText: { color: COLORS.white, marginTop: 16, fontSize: 16, fontWeight: '500', textShadowColor: '#000', textShadowRadius: 4 },
  bottomSection: { marginBottom: 80 },
  chipContainer: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  chip: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  demoBtn: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  demoBtnText: { color: '#000', fontWeight: 'bold' },

  // Collector Form Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: SPACING.xl,
    paddingBottom: 40,
    ...SHADOW.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scannedIdText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    marginBottom: SPACING.xl,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOW.floating,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Citizen QR Code Styles
  gradientHeader: {
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...SHADOW.medium,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  appBarIcon: { padding: 4 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 18, fontWeight: '800' },
  citizenHeader: { 
    alignItems: 'center', 
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  citizenTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: COLORS.white, 
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  citizenSubtitle: { 
    fontSize: 15, 
    color: 'rgba(255,255,255,0.85)', 
    textAlign: 'center', 
  },
  citizenContent: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    marginTop: -40,
  },
  qrCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 32, 
    padding: SPACING.xl, 
    alignItems: 'center', 
    ...SHADOW.floating,
    elevation: 10,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(231, 240, 237, 0.5)',
  },
  qrImageWrapper: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOW.card,
  },
  qrImage: { 
    width: 220, 
    height: 220,
  },
  qrUserDetails: {
    alignItems: 'center',
    width: '100%',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  qrHelperText: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  qrUserId: { 
    fontSize: 13, 
    color: COLORS.textSecondary, 
    marginTop: 6, 
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.full,
    gap: 8,
    width: '100%',
  },
  downloadBtnText: {
    color: COLORS.primaryDark,
    fontWeight: 'bold',
    fontSize: 15,
  },
  citizenInfoBox: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.white, 
    padding: SPACING.lg, 
    borderRadius: 24, 
    alignItems: 'center',
    gap: 16,
    ...SHADOW.card,
    borderWidth: 1,
    borderColor: COLORS.primaryLight
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  citizenInfoText: { 
    flex: 1, 
    color: COLORS.text, 
    fontSize: 14, 
    fontWeight: '500', 
    lineHeight: 22 
  }
});
