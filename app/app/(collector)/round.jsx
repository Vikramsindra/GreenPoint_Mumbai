// filepath: app/app/(collector)/round.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TextInput, TouchableOpacity, ActivityIndicator 
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
  const [stats, setStats] = useState({
    assignedHouseholds: 0,
    inspectedToday: 0,
    segregatedToday: 0,
    mixedToday: 0,
    noHandoverToday: 0,
    remainingToday: 0
  });
  const [assignedSociety, setAssignedSociety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRoundData = useCallback(async () => {
    try {
      const [hhRes, statsRes] = await Promise.all([
        api.getWardHouseholds().catch(err => ({ data: { success: false, error: err.message } })),
        api.getCollectorStats().catch(err => ({ data: { success: false, error: err.message } }))
      ]);

      if (hhRes.data?.success) {
        setHouseholds(hhRes.data.data.households || []);
        if (hhRes.data.data.society) {
          setAssignedSociety(hhRes.data.data.society);
        }
      }

      if (statsRes.data?.success) {
        const s = statsRes.data.data;
        setStats({
          assignedHouseholds: s.assignedHouseholds ?? (hhRes.data?.data?.households?.length || 0),
          inspectedToday: s.inspectedToday ?? s.scansToday ?? 0,
          segregatedToday: s.segregatedToday ?? s.scansToday ?? 0,
          mixedToday: s.mixedToday ?? 0,
          noHandoverToday: s.noHandoverToday ?? 0,
          remainingToday: s.remainingToday ?? Math.max(0, (hhRes.data?.data?.households?.length || 0) - (s.inspectedToday || 0))
        });
      }
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
    if (!isScannedToday(hh)) return 'unscanned';
    if (hh.lastOutcome === 'MIXED') return 'mixed';
    if (hh.lastOutcome === 'NO_HANDOVER') return 'no_handover';
    if (hh.lastOutcome === 'SEGREGATED') return 'segregated';
    return 'scanned';
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
    router.push({ pathname: '/(collector)/scan', params: { householdId: hh._id, initialOutcome: 'SEGREGATED' } });
  };

  const handleMixedPress = (hh) => {
    router.push({ pathname: '/(collector)/scan', params: { householdId: hh._id, initialOutcome: 'MIXED' } });
  };

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
            <Text style={styles.headerTitle}>Daily Household Round</Text>
          </View>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={styles.headerName}>Collector: {user?.name}</Text>
          <Text style={styles.headerSocietyName}>
            {assignedSociety ? `🏢 Society: ${assignedSociety.name}` : '🏢 Assigned Housing Society Round'}
          </Text>
        </View>

        {/* Operational Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#0f172a' }]}>{stats.assignedHouseholds}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.inspectedToday}</Text>
            <Text style={styles.statLabel}>Inspected</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#2563eb' }]}>{stats.remainingToday}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>

        <View style={[styles.statsGrid, { marginTop: 8 }]}>
          <View style={[styles.statCardSmall, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Text style={[styles.statValueSmall, { color: '#16a34a' }]}>{stats.segregatedToday}</Text>
            <Text style={[styles.statLabelSmall, { color: '#15803d' }]}>✓ Segregated</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
            <Text style={[styles.statValueSmall, { color: '#d97706' }]}>{stats.mixedToday}</Text>
            <Text style={[styles.statLabelSmall, { color: '#b45309' }]}>⚠️ Mixed</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
            <Text style={[styles.statValueSmall, { color: '#4b5563' }]}>{stats.noHandoverToday}</Text>
            <Text style={[styles.statLabelSmall, { color: '#374151' }]}>🚪 No Handover</Text>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information" size={18} color="#1e40af" />
          <Text style={styles.infoBannerText}>
            Select a household to record today's handover outcome. Mixed waste requires an explanatory note. No personal points or fines are issued.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={22} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search household address or resident..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* List of Households */}
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 24 }} />
          ) : sortedHouseholds.length > 0 ? (
            sortedHouseholds.map(hh => (
              <HouseholdCard 
                key={hh._id} 
                household={hh} 
                scanStatus={getScanStatus(hh)}
                onScanPress={handleScanPress}
                onMixedPress={handleMixedPress}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="home-search-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching households found' : 'No approved member households found in assigned society'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#16a34a',
    padding: 16,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  headerName: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginTop: 2,
  },
  headerSocietyName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontWeight: '500',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  statCardSmall: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValueSmall: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabelSmall: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#1e40af',
    lineHeight: 16,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    padding: 0,
  },

  listContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
});
