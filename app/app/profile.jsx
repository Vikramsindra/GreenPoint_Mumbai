// filepath: app/app/profile.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { usePointsStore } from '../store/pointsStore';
import { COLORS, SPACING, SHADOW, RADIUS } from '../constants/theme';
import * as api from '../services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { balance } = usePointsStore();
  const [badges, setBadges] = useState([]);
  const [badgeStats, setBadgeStats] = useState({ totalEarned: 0, total: 0 });
  const [loadingBadges, setLoadingBadges] = useState(true);

  useEffect(() => {
    if (user?.role === 'citizen') {
      fetchBadges();
    } else {
      setLoadingBadges(false);
    }
  }, [user]);

  const fetchBadges = async () => {
    try {
      const res = await api.getBadges();
      if (res.success) {
        setBadges(res.data.badges);
        setBadgeStats({ totalEarned: res.data.totalEarned, total: res.data.total });
      }
    } catch (err) {
      console.error('Badge fetch error:', err);
    } finally {
      setLoadingBadges(false);
    }
  };

  const earnedBadges = badges.filter(b => b.earned);
  const inProgressBadges = badges.filter(b => !b.earned);

  // Determine citizen tier based on balance
  const getTier = () => {
    if (balance >= 1000) return { name: 'Mumbai Legend', icon: '⭐', color: '#EAB308' };
    if (balance >= 500) return { name: 'Green Champion', icon: '🏆', color: '#16A34A' };
    if (balance >= 200) return { name: 'Eco Warrior', icon: '🛡️', color: '#2563EB' };
    if (balance >= 50) return { name: 'Green Starter', icon: '🌿', color: '#059669' };
    return { name: 'Seedling', icon: '🌱', color: '#6B7280' };
  };

  const tier = getTier();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Green Header */}
        <View style={styles.headerBg}>
          <View style={styles.appBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.appBarTitle}>Profile</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Avatar & Tier */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 40 }}>🧑🏽</Text>
            </View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userPhone}>{user?.phone || ''}</Text>

            {/* Tier Badge */}
            {user?.role === 'citizen' && (
              <View style={[styles.tierBadge, { backgroundColor: tier.color + '20', borderColor: tier.color + '60' }]}>
                <Text style={styles.tierIcon}>{tier.icon}</Text>
                <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Points Summary */}
          {user?.role === 'citizen' && (
            <View style={styles.pointsCard}>
              <View style={styles.pointsStat}>
                <Text style={styles.pointsValue}>{balance}</Text>
                <Text style={styles.pointsLabel}>GreenPoints</Text>
              </View>
              <View style={styles.pointsDivider} />
              <View style={styles.pointsStat}>
                <Text style={styles.pointsValue}>{badgeStats.totalEarned}</Text>
                <Text style={styles.pointsLabel}>Badges</Text>
              </View>
              <View style={styles.pointsDivider} />
              <TouchableOpacity style={styles.pointsStat} onPress={() => router.push('/leaderboard')}>
                <Ionicons name="trophy" size={22} color={COLORS.primary} />
                <Text style={[styles.pointsLabel, { color: COLORS.primary, fontWeight: '600' }]}>Leaderboard</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Details Card */}
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{user?.name}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>{user?.phone}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Role</Text>
              <Text style={styles.detailValue}>{user?.role?.toUpperCase() || 'CITIZEN'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ward</Text>
              <Text style={styles.detailValue}>{user?.wardId || 'N-WARD'}</Text>
            </View>

            {(user?.role === 'collector' || user?.role === 'admin') && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Collector ID</Text>
                  <Text style={styles.detailValue}>{user?.collectorId || 'N/A'}</Text>
                </View>
              </>
            )}
          </View>

          {/* Badges Section - Citizen Only */}
          {user?.role === 'citizen' && (
            <>
              {/* Earned Badges */}
              {earnedBadges.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>🏅 Badges Earned ({earnedBadges.length})</Text>
                  <View style={styles.badgeGrid}>
                    {earnedBadges.map(badge => (
                      <View key={badge.id} style={styles.badgeCard}>
                        <View style={styles.badgeIconCircle}>
                          <Text style={styles.badgeIcon}>{badge.icon}</Text>
                        </View>
                        <Text style={styles.badgeName}>{badge.name}</Text>
                        <Text style={styles.badgeDesc}>{badge.desc}</Text>
                        <View style={styles.badgeEarnedTag}>
                          <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
                          <Text style={styles.badgeEarnedText}>Earned!</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* In Progress Badges */}
              {inProgressBadges.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>🎯 In Progress ({inProgressBadges.length})</Text>
                  <View style={styles.badgeGrid}>
                    {inProgressBadges.map(badge => (
                      <View key={badge.id} style={[styles.badgeCard, styles.badgeCardLocked]}>
                        <View style={[styles.badgeIconCircle, styles.badgeIconLocked]}>
                          <Text style={[styles.badgeIcon, { opacity: 0.4 }]}>{badge.icon}</Text>
                        </View>
                        <Text style={[styles.badgeName, { color: COLORS.textMuted }]}>{badge.name}</Text>
                        <Text style={styles.badgeDesc}>{badge.desc}</Text>
                        {/* Progress bar */}
                        <View style={styles.progressBarContainer}>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${(badge.progress / badge.target) * 100}%` }]} />
                          </View>
                          <Text style={styles.progressText}>{badge.progress}/{badge.target}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  headerBg: { backgroundColor: COLORS.primary, paddingBottom: 30 },
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { padding: 4 },
  appBarTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  avatarContainer: { alignItems: 'center', marginTop: 8 },
  avatar: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  userPhone: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full,
    borderWidth: 1, marginTop: 12,
  },
  tierIcon: { fontSize: 16 },
  tierName: { fontSize: 13, fontWeight: 'bold' },

  content: { padding: SPACING.lg, paddingBottom: 40, marginTop: -16 },

  // Points Card
  pointsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 16,
    ...SHADOW.card, marginBottom: 20,
  },
  pointsStat: { flex: 1, alignItems: 'center', gap: 4 },
  pointsValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  pointsLabel: { fontSize: 12, color: COLORS.textMuted },
  pointsDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  // Details
  detailCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card, marginBottom: 24,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  detailLabel: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  detailValue: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border },

  // Badges
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  badgeCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', ...SHADOW.card, borderWidth: 1, borderColor: COLORS.border,
  },
  badgeCardLocked: { backgroundColor: '#fafafa', borderColor: '#f3f4f6' },
  badgeIconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  badgeIconLocked: { backgroundColor: '#f3f4f6' },
  badgeIcon: { fontSize: 24 },
  badgeName: { fontSize: 13, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 4 },
  badgeDesc: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', lineHeight: 15 },
  badgeEarnedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 8,
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full,
  },
  badgeEarnedText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },

  // Progress
  progressBarContainer: { width: '100%', marginTop: 8, alignItems: 'center' },
  progressBarBg: { width: '100%', height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 12, backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA', marginTop: 8,
  },
  logoutText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 16 },
});
