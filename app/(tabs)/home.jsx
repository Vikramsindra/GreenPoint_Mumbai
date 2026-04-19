// app/(tabs)/home.jsx
// GreenPoint Mumbai — Home screen
// Shows balance card, recent activity feed, and active campaign banner.

import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Banner, Card, Chip, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { getBalance, getCampaigns, getHistory } from '../services/api';
import useAuthStore from '../store/authStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY   = '#16a34a';
const PRIMARY_L = '#bbf7d0'; // light green for earn chip background
const DEDUCT_C  = '#ef4444'; // red for deductions

/** Human-readable labels for action enum values */
const ACTION_LABEL = {
  SEGREGATION:      'Waste Segregation',
  COMPOSTING:       'Composting',
  RECYCLABLE_DROP:  'Recyclable Drop-off',
  QUIZ_PASS:        'Quiz Passed',
  CAMPAIGN_BONUS:   'Campaign Bonus',
  VIOLATION_PENALTY:'Violation Penalty',
  REDEMPTION:       'Points Redeemed',
  REFERRAL:         'Referral Bonus',
};

// ─── Helper Components ────────────────────────────────────────────────────────

/**
 * Single row in the Recent Activity list.
 */
const ActivityRow = ({ item }) => {
  const isEarn  = item.type === 'EARN';
  const label   = ACTION_LABEL[item.action] ?? item.action;
  const sign    = isEarn ? '+' : '−';
  const color   = isEarn ? PRIMARY : DEDUCT_C;
  const icon    = isEarn ? '✓' : '✗';
  const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <View style={styles.activityRow}>
      {/* Icon bubble */}
      <View style={[styles.iconBubble, { backgroundColor: isEarn ? PRIMARY_L : '#fee2e2' }]}>
        <Text style={[styles.iconText, { color }]}>{icon}</Text>
      </View>

      {/* Label + date */}
      <View style={styles.activityInfo}>
        <Text style={styles.activityLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.activityDate}>{dateStr}</Text>
      </View>

      {/* Points */}
      <Text style={[styles.activityPoints, { color }]}>
        {sign}{item.points} pts
      </Text>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  const [balance,    setBalance]    = useState(null);
  const [events,     setEvents]     = useState([]);
  const [campaigns,  setCampaigns]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  // ── Data fetch ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [balRes, histRes, campRes] = await Promise.all([
        getBalance(),
        getHistory(10, 1),
        getCampaigns(user?.wardId),
      ]);
      setBalance(balRes.balance);
      setEvents(histRes.events ?? []);
      setCampaigns(campRes.campaigns ?? []);
    } catch (err) {
      setError(err.userMessage ?? 'Failed to load data');
    }
  }, [user?.wardId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderHeader = () => (
    <View>
      {/* ── Balance Card ── */}
      <Card style={styles.balanceCard} elevation={4}>
        <Card.Content style={styles.balanceContent}>
          <Text style={styles.greeting}>
            👋 Namaste, {user?.name?.split(' ')[0] ?? 'Citizen'}
          </Text>
          <Text style={styles.balanceLabel}>Your GreenPoints Balance</Text>
          {balance === null ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginVertical: 8 }} />
          ) : (
            <Text style={styles.balanceNumber}>{balance.toLocaleString('en-IN')}</Text>
          )}
          <Chip
            icon="leaf"
            style={styles.wardChip}
            textStyle={styles.wardChipText}
          >
            {user?.wardId ?? 'N-Ward'} · Mumbai
          </Chip>
        </Card.Content>
      </Card>

      {/* ── Error banner ── */}
      {error && (
        <Banner
          visible
          icon="alert"
          style={styles.errorBanner}
          actions={[{ label: 'Retry', onPress: loadData }]}
        >
          {error}
        </Banner>
      )}

      {/* ── Section heading ── */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
    </View>
  );

  const renderFooter = () => {
    if (campaigns.length === 0) return null;
    const campaign = campaigns[0];
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/learn')}
        style={styles.campaignBanner}
      >
        <Text style={styles.campaignEmoji}>🌱</Text>
        <View style={styles.campaignText}>
          <Text style={styles.campaignTitle}>{campaign.title}</Text>
          <Text style={styles.campaignSub}>
            Earn {campaign.bonusPoints} pts · Tap to join
          </Text>
        </View>
        <Text style={styles.campaignArrow}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>♻️</Text>
      <Text style={styles.emptyText}>No activity yet.</Text>
      <Text style={styles.emptySubtext}>
        Scan a bin QR code to earn your first GreenPoints!
      </Text>
    </View>
  );

  // ── Full-screen loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={PRIMARY} size="large" />
        <Text style={styles.loadingText}>Loading your dashboard…</Text>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <ActivityRow item={item} />}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  list:      { paddingBottom: 32 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' },

  // Balance card
  balanceCard: {
    margin: 16,
    borderRadius: 20,
    backgroundColor: PRIMARY,
  },
  balanceContent: { alignItems: 'center', paddingVertical: 20 },
  greeting: {
    color: '#d1fae5',
    fontSize: 14,
    marginBottom: 4,
  },
  balanceLabel: {
    color: '#d1fae5',
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  balanceNumber: {
    color: '#ffffff',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 60,
  },
  wardChip: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  wardChipText: { color: '#fff', fontSize: 12 },

  // Error
  errorBanner: { marginHorizontal: 16, borderRadius: 12 },

  // Section title
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#14532d',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },

  // Activity rows
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText:      { fontSize: 18, fontWeight: '700' },
  activityInfo:  { flex: 1 },
  activityLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  activityDate:  { fontSize: 12, color: '#6b7280', marginTop: 2 },
  activityPoints:{ fontSize: 15, fontWeight: '700' },

  // Campaign banner
  campaignBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  campaignEmoji: { fontSize: 28, marginRight: 12 },
  campaignText:  { flex: 1 },
  campaignTitle: { fontSize: 15, fontWeight: '700', color: '#14532d' },
  campaignSub:   { fontSize: 12, color: '#6b7280', marginTop: 2 },
  campaignArrow: { fontSize: 24, color: PRIMARY, fontWeight: '300' },

  // Empty state
  emptyState:   { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyText:    { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubtext: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4 },

  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
});
