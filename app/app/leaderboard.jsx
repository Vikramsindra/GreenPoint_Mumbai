// filepath: app/app/leaderboard.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, SHADOW, RADIUS } from '../constants/theme';
import * as api from '../services/api';

const MEDAL_COLORS = {
  0: { bg: '#FEF08A', text: '#854D0E', border: '#FACC15' },
  1: { bg: '#E5E7EB', text: '#374151', border: '#D1D5DB' },
  2: { bg: '#FED7AA', text: '#9A3412', border: '#FB923C' },
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [leaders, setLeaders] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [totalCitizens, setTotalCitizens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.getLeaderboard(20);
      if (res.success) {
        setLeaders(res.data.leaders);
        setMyRank(res.data.myRank);
        setTotalCitizens(res.data.totalCitizens);
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchLeaderboard(); };

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* My rank pill */}
        {myRank && (
          <View style={styles.myRankContainer}>
            <View style={styles.myRankPill}>
              <Ionicons name="trophy" size={18} color={COLORS.primary} />
              <Text style={styles.myRankText}>
                Your Rank: <Text style={styles.myRankBold}>#{myRank}</Text>
                <Text style={styles.myRankTotal}> of {totalCitizens}</Text>
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Top 3 Podium */}
          {top3.length >= 3 && (
            <View style={styles.podiumContainer}>
              {/* 2nd place */}
              <View style={[styles.podiumItem, { marginTop: 20 }]}>
                <View style={[styles.podiumAvatar, { backgroundColor: MEDAL_COLORS[1].bg, borderColor: MEDAL_COLORS[1].border }]}>
                  <Text style={styles.podiumAvatarText}>{top3[1].name?.charAt(0)}</Text>
                </View>
                <View style={styles.podiumMedal}>
                  <Text style={styles.podiumMedalText}>🥈</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{top3[1].name}</Text>
                <Text style={styles.podiumPoints}>{top3[1].pointsBalance} pts</Text>
                <View style={[styles.podiumBar, { height: 60, backgroundColor: '#E5E7EB' }]} />
              </View>

              {/* 1st place */}
              <View style={styles.podiumItem}>
                <View style={[styles.podiumAvatar, styles.podiumAvatarFirst, { backgroundColor: MEDAL_COLORS[0].bg, borderColor: MEDAL_COLORS[0].border }]}>
                  <Text style={[styles.podiumAvatarText, { fontSize: 22 }]}>{top3[0].name?.charAt(0)}</Text>
                </View>
                <View style={styles.podiumMedal}>
                  <Text style={[styles.podiumMedalText, { fontSize: 28 }]}>🥇</Text>
                </View>
                <Text style={[styles.podiumName, styles.podiumNameFirst]} numberOfLines={1}>{top3[0].name}</Text>
                <Text style={[styles.podiumPoints, styles.podiumPointsFirst]}>{top3[0].pointsBalance} pts</Text>
                <View style={[styles.podiumBar, { height: 80, backgroundColor: COLORS.primary }]} />
              </View>

              {/* 3rd place */}
              <View style={[styles.podiumItem, { marginTop: 30 }]}>
                <View style={[styles.podiumAvatar, { backgroundColor: MEDAL_COLORS[2].bg, borderColor: MEDAL_COLORS[2].border }]}>
                  <Text style={styles.podiumAvatarText}>{top3[2].name?.charAt(0)}</Text>
                </View>
                <View style={styles.podiumMedal}>
                  <Text style={styles.podiumMedalText}>🥉</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{top3[2].name}</Text>
                <Text style={styles.podiumPoints}>{top3[2].pointsBalance} pts</Text>
                <View style={[styles.podiumBar, { height: 45, backgroundColor: '#FED7AA' }]} />
              </View>
            </View>
          )}

          {/* Rest of the list */}
          <View style={styles.listContainer}>
            {rest.map((citizen, idx) => {
              const rank = idx + 4;
              const isMe = citizen._id === user?._id || citizen._id === user?.id;
              return (
                <View key={citizen._id} style={[styles.listItem, isMe && styles.listItemMe]}>
                  <View style={styles.rankCircle}>
                    <Text style={styles.rankText}>{rank}</Text>
                  </View>
                  <View style={styles.listAvatar}>
                    <Text style={styles.listAvatarText}>{citizen.name?.charAt(0)}</Text>
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, isMe && styles.listNameMe]}>{citizen.name} {isMe ? '(You)' : ''}</Text>
                    <Text style={styles.listPhone}>{citizen.phone?.replace(/(\d{3})(\d{3})(\d{4})/, '$1 *** $3')}</Text>
                  </View>
                  <View style={styles.listPointsBadge}>
                    <Text style={styles.listPoints}>{citizen.pointsBalance}</Text>
                    <Text style={styles.listPtsLabel}>pts</Text>
                  </View>
                </View>
              );
            })}

            {leaders.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyText}>No leaderboard data yet</Text>
                <Text style={styles.emptySubtext}>Start earning points to see rankings!</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 40 },

  myRankContainer: { backgroundColor: COLORS.primary, paddingBottom: 20, paddingHorizontal: SPACING.lg },
  myRankPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 10,
    ...SHADOW.card,
  },
  myRankText: { fontSize: 14, color: COLORS.textSecondary },
  myRankBold: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  myRankTotal: { fontSize: 13, color: COLORS.textMuted },

  // Podium
  podiumContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingTop: 30, paddingBottom: 10,
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16,
    borderRadius: RADIUS.lg, ...SHADOW.card,
  },
  podiumItem: { flex: 1, alignItems: 'center' },
  podiumAvatar: {
    width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: 4,
  },
  podiumAvatarFirst: { width: 56, height: 56, borderRadius: 28, borderWidth: 3 },
  podiumAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#374151' },
  podiumMedal: { marginVertical: 4 },
  podiumMedalText: { fontSize: 22 },
  podiumName: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center', maxWidth: 90 },
  podiumNameFirst: { fontSize: 14, color: COLORS.primary },
  podiumPoints: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary, marginTop: 2 },
  podiumPointsFirst: { fontSize: 14, color: COLORS.primary },
  podiumBar: { width: '70%', borderTopLeftRadius: 6, borderTopRightRadius: 6, marginTop: 8 },

  // List
  listContainer: { paddingHorizontal: 16, marginTop: 16 },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    ...SHADOW.card,
  },
  listItemMe: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  rankCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  rankText: { fontSize: 12, fontWeight: 'bold', color: '#6b7280' },
  listAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryMuted,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  listAvatarText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  listInfo: { flex: 1 },
  listName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  listNameMe: { color: COLORS.primary },
  listPhone: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  listPointsBadge: { alignItems: 'flex-end' },
  listPoints: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  listPtsLabel: { fontSize: 11, color: COLORS.textMuted },

  emptyContainer: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
});
