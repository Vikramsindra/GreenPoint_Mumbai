// filepath: app/app/(collector)/history.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as api from '../../services/api';

export default function CollectorHistoryScreen() {
  const [stats, setStats] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const [statsRes, histRes] = await Promise.all([
        api.getCollectorStats().catch(() => ({ data: { success: false } })),
        api.getCollectorHistory().catch(() => ({ data: { success: false } }))
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
      if (histRes.data?.success) {
        setInspections(histRes.data.data.inspections || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { 
    fetchHistory(); 
  }, [fetchHistory]);

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchHistory(); 
  };

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'SEGREGATED':
        return {
          bg: '#dcfce7',
          color: '#166534',
          label: '✓ Segregated',
          icon: 'check-circle'
        };
      case 'MIXED':
        return {
          bg: '#fef3c7',
          color: '#92400e',
          label: '⚠️ Mixed Waste',
          icon: 'alert-circle'
        };
      case 'NO_HANDOVER':
        return {
          bg: '#f1f5f9',
          color: '#475569',
          label: '🚪 No Handover',
          icon: 'door-closed'
        };
      default:
        return {
          bg: '#f3f4f6',
          color: '#6b7280',
          label: outcome || 'Inspected',
          icon: 'checkbox-marked-circle-outline'
        };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Household Inspection History</Text>
        <Text style={styles.headerSubtitle}>Verified participation records in your assigned society</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Operational Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats?.inspectedToday || 0}</Text>
            <Text style={styles.statLabel}>Inspected Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#d97706' }]}>{stats?.mixedToday || 0}</Text>
            <Text style={styles.statLabel}>Mixed Noted</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#2563eb' }]}>{stats?.remainingToday || 0}</Text>
            <Text style={styles.statLabel}>Remaining Today</Text>
          </View>
        </View>

        {/* Inspections List */}
        <Text style={styles.sectionTitle}>Recorded Household Inspections</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 20 }} />
        ) : inspections.length > 0 ? (
          inspections.map((item) => {
            const badge = getOutcomeBadge(item.outcome);
            return (
              <View key={item._id} style={styles.historyCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.householdInfo}>
                    <Text style={styles.citizenName}>{item.citizenId?.name || 'Resident'}</Text>
                    <Text style={styles.householdAddress}>{item.householdId?.address || 'Society Household'}</Text>
                  </View>
                  <View style={[styles.outcomeBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.outcomeBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>"{item.notes}"</Text>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={styles.timeText}>
                    📅 {new Date(item.inspectedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(item.inspectedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.noPointsNotice}>Participation only</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No inspections recorded yet</Text>
            <Text style={styles.emptyText}>Completed household scans and outcomes will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#16a34a', padding: 20, paddingTop: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', elevation: 1, borderWidth: 1, borderColor: '#e2e8f0',
  },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },

  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  householdInfo: { flex: 1 },
  citizenName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  householdAddress: { fontSize: 13, color: '#475569', marginTop: 2 },
  outcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  outcomeBadgeText: { fontSize: 12, fontWeight: '700' },

  notesBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
  },
  notesLabel: { fontSize: 10, fontWeight: '700', color: '#92400e', marginBottom: 2 },
  notesText: { fontSize: 12, color: '#78350f' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  timeText: { fontSize: 11, color: '#94a3b8' },
  noPointsNotice: { fontSize: 11, color: '#16a34a', fontWeight: '600' },

  emptyCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginTop: 10 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 },
});
