// filepath: app/components/ActivityRow.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function ActivityRow({ event }) {
  const isEarn = event.type === 'EARN';
  const color = isEarn ? COLORS.primary : COLORS.danger;
  const iconBg = isEarn ? COLORS.primaryLight : COLORS.dangerLight;
  
  const getRelativeTime = (dateStr) => {
    const diff = new Date() - new Date(dateStr);
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hours ago`;
    return `${Math.floor(h / 24)} days ago`;
  };

  const formatAction = (action) => action.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <View style={styles.row}>
      <View style={styles.leftGroup}>
        <View style={[styles.iconCirc, { backgroundColor: iconBg }]}>
          <Text style={{ color, fontSize: 16, fontWeight: 'bold' }}>{isEarn ? '↑' : '↓'}</Text>
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.actionText}>{formatAction(event.action)}</Text>
          <Text style={styles.timeText}>{getRelativeTime(event.createdAt)}</Text>
        </View>
      </View>
      <Text style={[styles.pointsText, { color }]}>
        {isEarn ? '+' : '-'}{event.points}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  leftGroup: { flexDirection: 'row', alignItems: 'center' },
  iconCirc: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  textGroup: { justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 2 },
  timeText: { fontSize: 12, color: COLORS.textSecondary },
  pointsText: { fontSize: 15, fontWeight: 'bold' }
});
