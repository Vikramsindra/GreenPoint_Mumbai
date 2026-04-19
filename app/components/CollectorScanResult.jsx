// filepath: app/components/CollectorScanResult.jsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
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
  // If it failed because of duplicate scan, we treat it as an 'amber' warning state rather than red error
  const isDuplicate = !isSuccess && result.message && result.message.includes('Already scanned');
  
  const bgColor = isSuccess ? '#16a34a' : isDuplicate ? '#d97706' : '#dc2626';
  const iconName = isSuccess ? 'check-circle' : isDuplicate ? 'clock-alert' : 'close-circle';
  const heading = isSuccess ? 'Success' : isDuplicate ? 'Already Scanned' : 'Scan Error';

  return (
    <Animated.View style={[
      styles.overlay,
      { backgroundColor: bgColor, opacity: opacityAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      <View style={styles.content}>
        <MaterialCommunityIcons name={iconName} size={96} color="#fff" style={styles.icon} />
        
        <Text style={styles.heading}>{heading}</Text>
        
        {isSuccess && result.data && (
          <>
            <Text style={styles.citizenName}>{result.data.citizenName}</Text>
            <Text style={styles.address}>{result.data.householdAddress}</Text>
            
            <View style={styles.pointsBox}>
              <Text style={styles.pointsText}>+{result.data.pointsEarned} GreenPoints credited</Text>
            </View>
            <Text style={styles.balanceText}>Balance: {result.data.citizenNewBalance} pts</Text>
          </>
        )}

        {!isSuccess && (
          <Text style={styles.errorText}>{result.message}</Text>
        )}
      </View>

      <View style={styles.btnContainer}>
        <TouchableOpacity style={styles.btn} onPress={onScanNext}>
          <Text style={styles.btnText}>{isSuccess ? 'Scan Next' : 'Try Again'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={onGoToRound}>
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
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  citizenName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  pointsBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 10,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 26,
  },
  btnContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  btn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
