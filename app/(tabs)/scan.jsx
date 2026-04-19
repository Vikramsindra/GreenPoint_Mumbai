// app/(tabs)/scan.jsx
// GreenPoint Mumbai — QR Scan screen
// Full-screen barcode scanner with animated success/error feedback modal.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';

import { scanQR } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY     = '#16a34a';
const { width: W } = Dimensions.get('window');
const FRAME_SIZE  = W * 0.65;

const MOCK_QR = 'BIN-N001-MOCK'; // used by the "Test Scan" button

// ─── Result Modal ─────────────────────────────────────────────────────────────

/**
 * Animated overlay that slides up after a scan result.
 *
 * @param {{ visible, result, onDismiss }} props
 *   result: { success: bool, pointsEarned?, newBalance?, message }
 */
const ResultModal = ({ visible, result, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim,   { toValue: 0,   useNativeDriver: true, tension: 60 }),
        Animated.timing(opacityAnim, { toValue: 1,   useNativeDriver: true, duration: 250 }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!result) return null;

  const isSuccess = result.success;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.modalBackdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.modalCard,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Icon */}
          <View style={[
            styles.modalIconRing,
            { borderColor: isSuccess ? PRIMARY : '#ef4444' },
          ]}>
            <Text style={styles.modalIcon}>
              {isSuccess ? '✓' : result.duplicate ? '⏰' : '✕'}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.modalTitle, { color: isSuccess ? PRIMARY : '#ef4444' }]}>
            {isSuccess
              ? `+${result.pointsEarned} GreenPoints Earned!`
              : result.duplicate
                ? 'Already Scanned Today'
                : 'Scan Failed'}
          </Text>

          {/* Body */}
          {isSuccess ? (
            <>
              <Text style={styles.modalBody}>Great job segregating your waste! 🌱</Text>
              <View style={styles.balancePill}>
                <Text style={styles.balancePillLabel}>New Balance</Text>
                <Text style={styles.balancePillValue}>
                  {result.newBalance?.toLocaleString('en-IN')} pts
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.modalBody}>
              {result.duplicate
                ? 'Come back tomorrow to earn more points!'
                : result.message ?? 'Something went wrong. Please try again.'}
            </Text>
          )}

          <Button
            mode="contained"
            onPress={onDismiss}
            buttonColor={isSuccess ? PRIMARY : '#6b7280'}
            style={styles.modalBtn}
            labelStyle={styles.modalBtnLabel}
          >
            {isSuccess ? 'Awesome!' : 'Dismiss'}
          </Button>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Viewfinder Frame Overlay ─────────────────────────────────────────────────

const FrameOverlay = ({ scanning }) => (
  <View style={styles.frameContainer} pointerEvents="none">
    {/* Dimmed areas around the frame */}
    <View style={styles.dimTop} />
    <View style={styles.dimMiddleRow}>
      <View style={styles.dimSide} />
      {/* The clear frame window */}
      <View style={[styles.frame, scanning && styles.frameScanning]}>
        {/* Corner brackets */}
        {[
          styles.cornerTL, styles.cornerTR,
          styles.cornerBL, styles.cornerBR,
        ].map((s, i) => (
          <View key={i} style={[styles.corner, s]} />
        ))}
      </View>
      <View style={styles.dimSide} />
    </View>
    <View style={styles.dimBottom} />
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning,   setScanning]       = useState(true);   // false while processing / modal open
  const [processing, setProcessing]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalResult,  setModalResult]  = useState(null);
  const scanCooldown = useRef(false);                        // prevents double-fires from camera

  // ── Scan handler ──────────────────────────────────────────────────────────

  const handleScan = useCallback(async (qrValue) => {
    if (!scanning || scanCooldown.current || processing) return;
    scanCooldown.current = true;
    setScanning(false);
    setProcessing(true);

    try {
      const result = await scanQR(qrValue, 'SEGREGATION');
      setModalResult({ success: true, ...result });
    } catch (err) {
      const isDuplicate = err.response?.status === 409;
      setModalResult({
        success:   false,
        duplicate: isDuplicate,
        message:   err.userMessage,
      });
    } finally {
      setProcessing(false);
      setModalVisible(true);
    }
  }, [scanning, processing]);

  const handleBarcodeScanned = useCallback(({ data }) => {
    handleScan(data);
  }, [handleScan]);

  const handleTestScan = useCallback(() => {
    handleScan(MOCK_QR);
  }, [handleScan]);

  const handleDismiss = useCallback(() => {
    setModalVisible(false);
    setModalResult(null);
    // Small delay before re-enabling scanner to avoid accidental immediate re-scan
    setTimeout(() => {
      scanCooldown.current = false;
      setScanning(true);
    }, 800);
  }, []);

  // ── Permission not granted ─────────────────────────────────────────────────

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <StatusBar style="dark" />
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permBody}>
          GreenPoint needs your camera to scan bin QR codes and log your waste segregation.
        </Text>
        <Button
          mode="contained"
          onPress={requestPermission}
          buttonColor={PRIMARY}
          style={styles.permBtn}
          labelStyle={styles.permBtnLabel}
        >
          Allow Camera
        </Button>
      </View>
    );
  }

  // ── Main scanner UI ────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Full-screen camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39'] }}
        onBarcodeScanned={scanning && !processing ? handleBarcodeScanned : undefined}
      />

      {/* Green frame overlay */}
      <FrameOverlay scanning={scanning && !processing} />

      {/* Header label */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan Bin QR Code</Text>
        <Text style={styles.headerSub}>
          Point at the QR code on a GreenPoint bin
        </Text>
      </View>

      {/* Processing spinner (replaces scanner while API call runs) */}
      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.processingText}>Logging your scan…</Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTestScan}
          disabled={processing || !scanning}
          activeOpacity={0.75}
        >
          <Text style={styles.testBtnText}>⚡ Test Scan (Demo)</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          {scanning ? 'Auto-detecting QR codes…' : 'Processing…'}
        </Text>
      </View>

      {/* Result modal */}
      <ResultModal
        visible={modalVisible}
        result={modalResult}
        onDismiss={handleDismiss}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CORNER = 20;
const BORDER = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' },

  // ── Header ──
  header: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Frame overlay ──
  frameContainer: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  dimTop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  dimBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  dimMiddleRow: { flexDirection: 'row', height: FRAME_SIZE },
  dimSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },

  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: 4,
  },
  frameScanning: {
    // subtle pulse would go here via Animated — static version for now
  },

  // Corner brackets
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: PRIMARY,
    borderWidth: BORDER,
  },
  cornerTL: { top: 0, left: 0,  borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0,  borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0,  borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0,  borderTopWidth: 0, borderBottomRightRadius: 4 },

  // ── Processing overlay ──
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: { color: '#fff', marginTop: 14, fontSize: 15 },

  // ── Bottom bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  testBtn: {
    backgroundColor: 'rgba(22,163,74,0.9)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 12,
    shadowColor: PRIMARY,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  testBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  // ── Permission screen ──
  permissionScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 32,
  },
  permIcon:    { fontSize: 64, marginBottom: 16 },
  permTitle:   { fontSize: 22, fontWeight: '700', color: '#14532d', marginBottom: 8, textAlign: 'center' },
  permBody:    { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  permBtn:     { marginTop: 24, borderRadius: 12, paddingHorizontal: 12 },
  permBtnLabel:{ fontSize: 16 },

  // ── Result modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    alignItems: 'center',
  },
  modalIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalIcon:  { fontSize: 32, fontWeight: '700' },
  modalTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  modalBody:  { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 16 },

  balancePill: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  balancePillLabel: { fontSize: 13, color: '#6b7280' },
  balancePillValue: { fontSize: 17, fontWeight: '800', color: PRIMARY },

  modalBtn:      { borderRadius: 14, paddingHorizontal: 16, marginTop: 4 },
  modalBtnLabel: { fontSize: 16, paddingVertical: 2 },
});
