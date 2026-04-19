// filepath: app/components/HouseholdCard.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HouseholdCard({ household, scanStatus, onScanPress, onViolationPress }) {
  const citizen = household.citizenId || {};
  const initials = citizen.name ? citizen.name.substring(0, 2).toUpperCase() : '??';

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Never scanned';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString();
  };

  const getTimeString = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.card}>
      {/* Top Row */}
      <View style={styles.topRow}>
        <Text style={styles.addressText} numberOfLines={2}>{household.address}</Text>
        <View style={[
          styles.badge, 
          scanStatus === 'scanned' ? styles.badgeGreen : 
          scanStatus === 'violated' ? styles.badgeRed : 
          styles.badgeGrey
        ]}>
          <Text style={[
            styles.badgeText,
            scanStatus === 'scanned' ? styles.badgeTextGreen : 
            scanStatus === 'violated' ? styles.badgeTextRed : 
            styles.badgeTextGrey
          ]}>
            {scanStatus === 'scanned' ? 'Scanned ✓' : scanStatus === 'violated' ? 'Violation ⚠' : 'Pending'}
          </Text>
        </View>
      </View>

      {/* Citizen Row */}
      <View style={styles.citizenRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.citizenInfo}>
          <Text style={styles.citizenName}>{citizen.name || 'Unknown'}</Text>
          <Text style={styles.citizenPhone}>{citizen.phone || 'No phone'}</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>Scanned {household.totalScans || 0} times</Text>
        <Text style={styles.statsText}>Last: {formatRelativeTime(household.lastScannedAt)}</Text>
      </View>

      {/* Action Row */}
      {scanStatus === 'unscanned' ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, styles.btnScan]} onPress={() => onScanPress(household)}>
            <Text style={styles.btnScanText}>Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnViolation]} onPress={() => onViolationPress(household)}>
            <Text style={styles.btnViolationText}>Log Violation</Text>
          </TouchableOpacity>
        </View>
      ) : scanStatus === 'scanned' ? (
        <View style={styles.statusRow}>
          <Text style={styles.statusTextGreen}>✓ Verified today at {getTimeString(household.lastScannedAt)}</Text>
        </View>
      ) : (
        <View style={styles.statusRow}>
          <Text style={styles.statusTextRed}>⚠ Violation logged</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGrey: { backgroundColor: '#f3f4f6' },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: '500' },
  badgeTextGrey: { color: '#6b7280' },
  badgeTextGreen: { color: '#16a34a' },
  badgeTextRed: { color: '#dc2626' },
  citizenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  citizenInfo: {
    flex: 1,
  },
  citizenName: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  citizenPhone: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnScan: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  btnViolation: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  btnScanText: {
    color: '#16a34a',
    fontWeight: '600',
  },
  btnViolationText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  statusRow: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusTextGreen: {
    color: '#16a34a',
    fontWeight: '600',
  },
  statusTextRed: {
    color: '#dc2626',
    fontWeight: '600',
  }
});
