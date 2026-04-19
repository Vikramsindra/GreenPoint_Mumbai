// filepath: app/app/(collector)/round.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TextInput, TouchableOpacity, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import * as api from '../../services/api';
import HouseholdCard from '../../components/HouseholdCard';

export default function RoundScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [households, setHouseholds] = useState([]);
  const [stats, setStats] = useState({ scansToday: 0, violationsToday: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [violationModalVisible, setViolationModalVisible] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [violationType, setViolationType] = useState(null);

  const fetchRoundData = useCallback(async () => {
    try {
      const [hhRes, statsRes] = await Promise.all([
        api.getWardHouseholds(),
        api.getCollectorStats()
      ]);
      if (hhRes.data?.success) setHouseholds(hhRes.data.data.households);
      if (statsRes.data?.success) setStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch round data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRoundData();
  }, [fetchRoundData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoundData();
  }, [fetchRoundData]);

  const todayStr = new Date().toDateString();
  const isScannedToday = (hh) => {
    if (!hh.lastScannedAt) return false;
    return new Date(hh.lastScannedAt).toDateString() === todayStr;
  };

  const getScanStatus = (hh) => {
    // In a real app we'd also check if a violation was logged today specifically
    // Here we just use scanned today for simplicity
    if (isScannedToday(hh)) return 'scanned';
    return 'unscanned';
  };

  const filteredHouseholds = households.filter(hh => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return hh.address.toLowerCase().includes(q) || 
           (hh.citizenId?.name || '').toLowerCase().includes(q);
  });

  const sortedHouseholds = [...filteredHouseholds].sort((a, b) => {
    const aStatus = getScanStatus(a);
    const bStatus = getScanStatus(b);
    if (aStatus === 'unscanned' && bStatus !== 'unscanned') return -1;
    if (aStatus !== 'unscanned' && bStatus === 'unscanned') return 1;
    return 0;
  });

  const handleScanPress = (hh) => {
    router.push({ pathname: '/(collector)/scan', params: { householdId: hh._id } });
  };

  const handleViolationPress = (hh) => {
    setSelectedHousehold(hh);
    setViolationType(null);
    setViolationModalVisible(true);
  };

  const confirmViolation = async () => {
    if (!selectedHousehold || !violationType) return;
    try {
      // In a full implementation we'd call the api.logViolation endpoint
      // and pass { citizenId: selectedHousehold.citizenId._id, type: violationType }
      // For this prototype, we'll just mock success and refresh
      alert(`Violation ${violationType} logged for ${selectedHousehold.citizenId.name}`);
      setViolationModalVisible(false);
      fetchRoundData();
    } catch (err) {
      alert('Failed to log violation');
    }
  };

  const remaining = households.length - stats.scansToday - stats.violationsToday;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/home')} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Daily Round</Text>
          </View>
          <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</Text>
          <Text style={styles.headerName}>Collector: {user?.name}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, {color: '#16a34a'}]}>{stats.scansToday}</Text>
            <Text style={styles.statLabel}>Scanned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, {color: '#dc2626'}]}>{stats.violationsToday}</Text>
            <Text style={styles.statLabel}>Violations</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, {color: '#6b7280'}]}>{remaining >= 0 ? remaining : 0}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={24} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search address or citizen..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* List */}
        <View style={styles.listContainer}>
          {sortedHouseholds.map(hh => (
            <HouseholdCard 
              key={hh._id} 
              household={hh} 
              scanStatus={getScanStatus(hh)}
              onScanPress={handleScanPress}
              onViolationPress={handleViolationPress}
            />
          ))}
          {sortedHouseholds.length === 0 && !loading && (
            <Text style={styles.emptyText}>No households found in your ward.</Text>
          )}
        </View>
      </ScrollView>

      {/* Violation Modal */}
      <Modal visible={violationModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Violation</Text>
            {selectedHousehold && (
              <View style={styles.modalHhInfo}>
                <Text style={styles.modalCitizenName}>{selectedHousehold.citizenId.name}</Text>
                <Text style={styles.modalAddress}>{selectedHousehold.address}</Text>
              </View>
            )}

            <Text style={styles.typeLabel}>Select Violation Type:</Text>
            <View style={styles.typeGrid}>
              {[
                { id: 'NON_SEGREGATION', name: 'Non-Segregation', sub: 'Mixed wet/dry', icon: 'trash-can-outline' },
                { id: 'LITTERING', name: 'Littering', sub: 'Waste thrown outside', icon: 'delete-empty' },
                { id: 'BURNING', name: 'Burning', sub: 'Burning waste', icon: 'fire' },
                { id: 'BULK_VIOLATION', name: 'Bulk Violation', sub: '>100kg unauthorized', icon: 'weight-kilogram' },
              ].map(type => (
                <TouchableOpacity 
                  key={type.id} 
                  style={[styles.typeBtn, violationType === type.id && styles.typeBtnSelected]}
                  onPress={() => setViolationType(type.id)}
                >
                  <MaterialCommunityIcons name={type.icon} size={24} color={violationType === type.id ? '#dc2626' : '#6b7280'} />
                  <Text style={[styles.typeName, violationType === type.id && styles.typeNameSelected]}>{type.name}</Text>
                  <Text style={styles.typeSub}>{type.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.gpsNote}>Location will be recorded automatically</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setViolationModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirm, !violationType && styles.modalConfirmDisabled]} 
                onPress={confirmViolation}
                disabled={!violationType}
              >
                <Text style={styles.modalConfirmText}>Confirm & Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#16a34a',
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerDate: { color: '#fff', fontSize: 14, marginTop: 4, opacity: 0.9 },
  headerName: { color: '#fff', fontSize: 13, marginTop: 8, opacity: 0.8 },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15 },
  listContainer: { paddingHorizontal: 16 },
  emptyText: { textAlign: 'center', color: '#6b7280', marginTop: 20 },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalHhInfo: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalCitizenName: { fontSize: 16, fontWeight: 'bold' },
  modalAddress: { fontSize: 13, color: '#4b5563', marginTop: 4 },
  typeLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  typeBtn: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  typeBtnSelected: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  typeName: { fontSize: 14, fontWeight: '600', marginTop: 8, color: '#4b5563' },
  typeNameSelected: { color: '#dc2626' },
  typeSub: { fontSize: 11, color: '#9ca3af', marginTop: 2, textAlign: 'center' },
  gpsNote: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center'
  },
  modalConfirm: {
    flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#dc2626', alignItems: 'center'
  },
  modalConfirmDisabled: { opacity: 0.5 },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#4b5563' },
  modalConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
