// filepath: app/components/HouseholdCard.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function HouseholdCard({ household, scanStatus, onScanPress, onMixedPress }) {
  const citizen = household.citizenId || {};
  const initials = citizen.name ? citizen.name.substring(0, 2).toUpperCase() : '??';

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Never inspected';
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

  const isInspected = scanStatus === 'scanned' || scanStatus === 'segregated' || scanStatus === 'mixed' || scanStatus === 'no_handover';

  let badgeStyle = styles.badgeGrey;
  let badgeTextStyle = styles.badgeTextGrey;
  let badgeLabel = 'Pending Inspection';

  if (scanStatus === 'segregated' || scanStatus === 'scanned') {
    badgeStyle = styles.badgeGreen;
    badgeTextStyle = styles.badgeTextGreen;
    badgeLabel = 'Segregated ✓';
  } else if (scanStatus === 'mixed') {
    badgeStyle = styles.badgeAmber;
    badgeTextStyle = styles.badgeTextAmber;
    badgeLabel = 'Mixed ⚠️';
  } else if (scanStatus === 'no_handover') {
    badgeStyle = styles.badgeSlate;
    badgeTextStyle = styles.badgeTextSlate;
    badgeLabel = 'No Handover 🚪';
  }

  return (
    <View style={styles.card}>
      {/* Top Row */}
      <View style={styles.topRow}>
        <Text style={styles.addressText} numberOfLines={2}>{household.address}</Text>
        <View style={[styles.badge, badgeStyle]}>
          <Text style={[styles.badgeText, badgeTextStyle]}>{badgeLabel}</Text>
        </View>
      </View>

      {/* Citizen Row */}
      <View style={styles.citizenRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.citizenInfo}>
          <Text style={styles.citizenName}>{citizen.name || 'Resident'}</Text>
          <Text style={styles.citizenPhone}>{citizen.phone || 'No phone'}</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>Inspected {household.totalScans || 0} times</Text>
        <Text style={styles.statsText}>Last: {formatRelativeTime(household.lastScannedAt)}</Text>
      </View>

      {/* Action Row */}
      {!isInspected ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, styles.btnScan]} onPress={() => onScanPress(household)}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.btnScanText}>Inspect</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnMixed]} onPress={() => onMixedPress(household)}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#b45309" style={{ marginRight: 4 }} />
            <Text style={styles.btnMixedText}>Flag Mixed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.statusRow}>
          <MaterialCommunityIcons 
            name={scanStatus === 'mixed' ? 'alert-circle' : scanStatus === 'no_handover' ? 'door-closed' : 'check-circle'} 
            size={16} 
            color={scanStatus === 'mixed' ? '#d97706' : scanStatus === 'no_handover' ? '#4b5563' : '#16a34a'} 
            style={{ marginRight: 6 }} 
          />
          <Text style={[
            styles.statusText,
            scanStatus === 'mixed' ? styles.statusTextAmber : scanStatus === 'no_handover' ? styles.statusTextSlate : styles.statusTextGreen
          ]}>
            Recorded today at {getTimeString(household.lastScannedAt)}
          </Text>
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
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeTextGreen: { color: '#166534', fontWeight: 'bold', fontSize: 11 },
  badgeAmber: { backgroundColor: '#fef3c7' },
  badgeTextAmber: { color: '#92400e', fontWeight: 'bold', fontSize: 11 },
  badgeSlate: { backgroundColor: '#f1f5f9' },
  badgeTextSlate: { color: '#475569', fontWeight: 'bold', fontSize: 11 },
  badgeGrey: { backgroundColor: '#f3f4f6' },
  badgeTextGrey: { color: '#6b7280', fontSize: 11 },
  badgeText: { fontSize: 11 },

  citizenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
  },
  citizenInfo: {
    flex: 1,
  },
  citizenName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  citizenPhone: {
    fontSize: 12,
    color: '#64748b',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginBottom: 10,
  },
  statsText: {
    fontSize: 12,
    color: '#94a3b8',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnScan: {
    backgroundColor: '#16a34a',
  },
  btnScanText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  btnMixed: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  btnMixedText: {
    color: '#b45309',
    fontWeight: 'bold',
    fontSize: 13,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextGreen: { color: '#16a34a' },
  statusTextAmber: { color: '#d97706' },
  statusTextSlate: { color: '#4b5563' },
});
