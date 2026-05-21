// filepath: app/app/(collector)/history.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../../services/api';

export default function CollectorHistoryScreen() {
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await api.getCollectorStats();
      if (res.data?.success) setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan History</Text>
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.scansToday || 0}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.scansThisWeek || 0}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.scansThisMonth || 0}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        {/* Today's Scans */}
        <Text style={styles.sectionTitle}>Today's Scans</Text>
        {stats?.topHouseholdsToday && stats.topHouseholdsToday.length > 0 ? (
          stats.topHouseholdsToday.map((hh, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.historyCard, expandedId === idx && styles.historyCardExpanded]}
              onPress={() => toggleExpand(idx)}
              activeOpacity={0.7}
            >
              <View style={styles.historyRow}>
                <View style={styles.historyDot} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyName}>{hh.citizenName}</Text>
                  <Text style={styles.historyAddress} numberOfLines={1}>{hh.address}</Text>
                </View>
                <Text style={styles.historyTime}>
                  {new Date(hh.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              
              {expandedId === idx && (
                <View style={styles.expandedDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Scan Type:</Text>
                    <Text style={styles.detailValue}>Daily Collection</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Points Awarded:</Text>
                    <Text style={[styles.detailValue, {color: '#16a34a', fontWeight: 'bold'}]}>+10 pts</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Exact Time:</Text>
                    <Text style={styles.detailValue}>{new Date(hh.scannedAt).toLocaleString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>Verified</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No scans recorded today</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#16a34a', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#16a34a' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  historyCard: {
    backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1,
  },
  historyCardExpanded: {
    borderColor: '#16a34a', borderWidth: 1,
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a', marginRight: 12 },
  historyContent: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  historyAddress: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  historyTime: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  expandedDetails: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6,
  },
  detailLabel: { fontSize: 12, color: '#6b7280' },
  detailValue: { fontSize: 12, color: '#374151', fontWeight: '500' },
  emptyCard: { backgroundColor: '#fff', padding: 30, borderRadius: 10, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
});
