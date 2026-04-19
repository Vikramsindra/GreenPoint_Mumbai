// filepath: app/components/ViolationCard.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOW } from '../constants/theme';

export default function ViolationCard({ violation, onAppeal }) {
  const formatType = (type) => type.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  
  const dateStr = new Date(violation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  
  const tierColor = violation.tier === 1 ? '#ea580c' : violation.tier === 2 ? '#ef4444' : '#991b1b';
  const tierBg = violation.tier === 1 ? '#ffedd5' : violation.tier === 2 ? '#fee2e2' : '#fecaca';

  const statusColors = {
    PENDING: { color: '#b45309', bg: '#fef3c7' },
    APPEALED: { color: '#1d4ed8', bg: '#dbeafe' },
    RESOLVED: { color: '#15803d', bg: '#dcfce7' },
    FINE_ISSUED: { color: '#b91c1c', bg: '#fee2e2' },
  };
  const stColor = statusColors[violation.status] || statusColors.PENDING;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{formatType(violation.type)}</Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>
      
      <View style={styles.badgesRow}>
        <View style={[styles.badge, { backgroundColor: tierBg }]}>
          <Text style={[styles.badgeText, { color: tierColor }]}>Tier {violation.tier}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: stColor.bg }]}>
          <Text style={[styles.badgeText, { color: stColor.color }]}>{violation.status}</Text>
        </View>
      </View>

      {(violation.fineAmount > 0 || violation.pointsDeducted > 0) && (
        <View style={styles.detailsRow}>
          {violation.fineAmount > 0 && <Text style={styles.fineText}>₹{violation.fineAmount} fine</Text>}
          {violation.pointsDeducted > 0 && <Text style={styles.pointsText}>-{violation.pointsDeducted} points</Text>}
        </View>
      )}

      {violation.status === 'PENDING' && !violation.appealSubmittedAt && (
        <TouchableOpacity style={styles.appealBtn} onPress={onAppeal}>
          <Text style={styles.appealBtnText}>Appeal This Violation</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 10, ...SHADOW.card },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  date: { fontSize: 13, color: COLORS.textSecondary },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  detailsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  fineText: { fontSize: 14, fontWeight: '600', color: COLORS.danger },
  pointsText: { fontSize: 14, fontWeight: '600', color: '#ea580c' },
  appealBtn: { marginTop: 12, alignSelf: 'flex-start' },
  appealBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 }
});
