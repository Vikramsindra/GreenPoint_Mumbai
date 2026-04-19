// filepath: app/components/ScanSuccessOverlay.jsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/theme';

export default function ScanSuccessOverlay({ visible, points, newBalance, message, type = 'success', onDismiss }) {
  const transY = useRef(new Animated.Value(200)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(transY, { toValue: 0, useNativeDriver: true, speed: 12 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(transY, { toValue: 50, duration: 250, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true })
        ]).start(() => onDismiss());
      }, type === 'success' ? 2500 : 2000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const isSuccess = type === 'success';

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={styles.overlayBg} />
      <Animated.View style={[
        styles.panel, 
        { backgroundColor: isSuccess ? COLORS.success : '#f97316' },
        { transform: [{ translateY: transY }], opacity }
      ]}>
        
        <View style={styles.iconCirc}>
          <Text style={{ fontSize: 32 }}>{isSuccess ? '✅' : '⏰'}</Text>
        </View>

        <Text style={styles.heading}>
          {isSuccess ? (points > 0 ? `+${points} GreenPoints!` : 'Logged Successfully') : 'Already scanned today!'}
        </Text>
        
        <Text style={styles.subText}>
          {message ? message : (isSuccess ? `Citizen New Balance: ${newBalance} pts` : 'Come back tomorrow')}
        </Text>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  panel: { position: 'absolute', bottom: 100, left: 20, right: 20, borderRadius: 20, padding: 30, alignItems: 'center', elevation: 10 },
  iconCirc: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 26, fontWeight: 'bold', color: COLORS.white, marginBottom: 8, textAlign: 'center' },
  subText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }
});
