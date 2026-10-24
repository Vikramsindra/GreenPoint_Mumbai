// filepath: app/components/CollectorScanResult.jsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CollectorScanResult({ visible, result, onScanNext, onGoToRound }) {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      slideAnim.setValue(100);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible || !result) return null;

  const isSuccess = result.success;
  const isDuplicate = !isSuccess && result.message && (
    result.message.includes('Already inspected') ||
    result.message.includes('Already scanned') ||
    result.message.includes('already has an inspection')
  );

  const outcome = result.data?.outcome || result.data?.inspection?.outcome || 'SEGREGATED';
  const notes = result.data?.notes || result.data?.inspection?.notes;
  const societyName = result.data?.societyName || result.data?.inspection?.societyName;
  const citizenName = result.data?.citizenName || result.data?.inspection?.citizenName;
  const householdAddress = result.data?.householdAddress || result.data?.inspection?.householdAddress;
  const timestamp = result.data?.scannedAt || result.data?.inspection?.inspectedAt || new Date();

  // Color theme based on state
  let bgColor = '#16a34a'; // Green default success
  let iconName = 'check-circle';
  let heading = 'Inspection Recorded';

  if (!isSuccess) {
    if (isDuplicate) {
      bgColor = '#d97706'; // Amber warning
      iconName = 'clock-alert';
      heading = 'Already Inspected Today';
    } else {
      bgColor = '#dc2626'; // Red error
      iconName = 'close-circle';
      heading = 'Inspection Failed';
    }
  } else {
    if (outcome === 'MIXED') {
      bgColor = '#d97706'; // Amber for mixed
      iconName = 'alert-circle';
      heading = 'Mixed Waste Noted';
    } else if (outcome === 'NO_HANDOVER') {
      bgColor = '#4b5563'; // Slate for no handover
      iconName = 'door-closed';
      heading = 'No Handover Recorded';
    }
  }

  const outcomeLabel =
    outcome === 'SEGREGATED'
      ? '✓ SEGREGATED HANDOVER'
      : outcome === 'MIXED'
      ? '⚠️ MIXED / NEEDS IMPROVEMENT'
      : '🚪 NO HANDOVER / ABSENT';

  return (
    <Animated.View style={[
      styles.overlay,
      { backgroundColor: bgColor, opacity: opacityAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MaterialCommunityIcons name={iconName} size={80} color="#fff" style={styles.icon} />
        
        <Text style={styles.heading}>{heading}</Text>
        
        {isSuccess && result.data && (
          <View style={styles.receiptCard}>
            <View style={styles.outcomeBadge}>
              <Text style={styles.outcomeBadgeText}>{outcomeLabel}</Text>
            </View>

            <Text style={styles.citizenName}>{citizenName}</Text>
            <Text style={styles.address}>{householdAddress}</Text>
            {societyName ? (
              <Text style={styles.societyText}>🏢 {societyName}</Text>
            ) : null}

            {notes ? (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notes / Reason:</Text>
                <Text style={styles.notesText}>"{notes}"</Text>
              </View>
            ) : null}

            <View style={styles.noticeBox}>
              <MaterialCommunityIcons name="information-outline" size={16} color="#15803d" />
              <Text style={styles.noticeText}>
                Participation recorded — no points awarded.
              </Text>
            </View>

            <Text style={styles.timeText}>
              Recorded at {new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </View>
        )}

        {!isSuccess && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{result.message}</Text>
            {isDuplicate && (
              <Text style={styles.duplicateTip}>
                Each household has one final recorded inspection per day to ensure clean daily participation records.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.btnContainer}>
        <TouchableOpacity style={styles.btn} onPress={onScanNext}>
          <Text style={styles.btnText}>{isSuccess ? 'Scan Next' : 'Try Again'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.secondaryBtn]} onPress={onGoToRound}>
          <Text style={styles.btnText}>Back to Round</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  icon: {
    marginBottom: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  receiptCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  outcomeBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  outcomeBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  citizenName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  address: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 4,
  },
  societyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
    marginBottom: 14,
  },
  notesContainer: {
    width: '100%',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 13,
    color: '#78350f',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 10,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  timeText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  errorCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },
  duplicateTip: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  btnContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
  },
  btnText: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: 'bold',
  }
});
