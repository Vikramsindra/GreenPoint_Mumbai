import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePointsStore } from '../store/pointsStore';
import { COLORS, SPACING, SHADOW } from '../constants/theme';

export default function RewardsHistoryScreen() {
  const router = useRouter();
  const { history } = usePointsStore();

  // Filter history for redemptions
  const redemptions = history.filter(h => h.action === 'REDEMPTION' || h.type === 'DEDUCT');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Reward History</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {redemptions.length > 0 ? (
            redemptions.map(r => {
              let expiresAt = r.metadata?.expiresAt ? new Date(r.metadata.expiresAt) : new Date(new Date(r.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
              const isExpired = expiresAt < new Date();
              
              return (
                <View key={r._id} style={styles.rewardCard}>
                  <View style={styles.rewardHeader}>
                    <Ionicons name="gift" size={20} color={COLORS.primary} />
                    <Text style={styles.rewardTitle} numberOfLines={1}>{r.description || 'Reward Redeemed'}</Text>
                  </View>
                  
                  {r.metadata?.voucherCode && (
                    <View style={styles.voucherBox}>
                      <Text style={styles.voucherText}>{r.metadata.voucherCode}</Text>
                    </View>
                  )}
                  
                  <View style={styles.rewardFooter}>
                    <Text style={styles.rewardDate}>Redeemed: {new Date(r.createdAt).toLocaleDateString()}</Text>
                    <Text style={[styles.rewardExpiry, isExpired && { color: COLORS.danger }]}>
                      {isExpired ? 'Expired' : `Expires: ${expiresAt.toLocaleDateString()}`}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyStateText}>No rewards redeemed yet</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  backBtn: { padding: 4 },
  appBarTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  
  rewardCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.card,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rewardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  voucherBox: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  voucherText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: COLORS.text,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rewardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  rewardExpiry: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  }
});
