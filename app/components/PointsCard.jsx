// filepath: app/components/PointsCard.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOW } from '../constants/theme';

export default function PointsCard({ balance, todayEarned = 0 }) {
  return (
    <View style={styles.card}>
      <Text style={styles.balance}>{balance}</Text>
      <Text style={styles.label}>GreenPoints Balance</Text>
      
      <View style={styles.footerRow}>
        {todayEarned > 0 ? (
           <View style={styles.pill}><Text style={styles.pillText}>+{todayEarned} today</Text></View>
        ) : (
           <Text style={styles.mutedText}>No scans today</Text>
        )}
        <Text style={styles.mutedText}>Expires never</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, ...SHADOW.card },
  balance: { fontSize: 44, fontWeight: 'bold', color: COLORS.primary },
  label: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { backgroundColor: COLORS.primaryMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pillText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '600' },
  mutedText: { color: COLORS.textMuted, fontSize: 12 }
});
