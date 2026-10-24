// filepath: app/app/(officer)/portal.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { COLORS, SPACING, SHADOW, RADIUS } from '../../constants/theme';

export default function OfficerPortal() {
  const { user, logout } = useAuthStore();
  const { openMenu } = useUiStore();

  const configuredDashboardUrl = process.env.EXPO_PUBLIC_DASHBOARD_URL?.trim();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
        style={styles.gradientHeader}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.appBar}>
            <TouchableOpacity style={styles.appBarIcon} onPress={openMenu}>
              <Ionicons name="menu-outline" size={28} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.logoText}>GreenPoint</Text>
            </View>
            <TouchableOpacity style={styles.appBarIcon} onPress={logout}>
              <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Ward Officer Portal</Text>
            <Text style={styles.headerSubtitle}>
              Administrative Oversight & Society Verification
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Officer Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 32 }}>🏛️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.officerName}>{user?.name || 'Ward Officer'}</Text>
              <Text style={styles.officerPhone}>{user?.phone}</Text>
              <View style={styles.wardBadge}>
                <Text style={styles.wardBadgeText}>📍 {user?.wardId || 'N-WARD'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dashboard Access Instructions Card */}
        <View style={[styles.card, styles.infoCard]}>
          <View style={styles.iconCircle}>
            <Ionicons name="desktop-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Web Dashboard Access</Text>
          <Text style={styles.cardBody}>
            Housing society applications, municipal waste handovers, officer reviews, and collector audits are operated via the GreenPoint Web Dashboard on BMC workstations.
          </Text>

          {configuredDashboardUrl ? (
            <View style={styles.urlBox}>
              <Text style={styles.urlLabel}>Configured Dashboard URL:</Text>
              <Text style={styles.urlText}>{configuredDashboardUrl}</Text>
            </View>
          ) : (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                Access the Web Dashboard on your authorized BMC computer terminal.
              </Text>
            </View>
          )}

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>Review and approve housing society applications</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>Assign BMC collectors to municipal collection points</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>Audit daily segregation and resolve violation appeals</Text>
            </View>
          </View>
        </View>

        {/* Logout Action */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  gradientHeader: {
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...SHADOW.medium,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  appBarIcon: { padding: 4 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    marginTop: -24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.xl,
    marginBottom: 16,
    ...SHADOW.floating,
    borderWidth: 1,
    borderColor: 'rgba(231, 240, 237, 0.6)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  officerName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  officerPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  wardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  wardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  infoCard: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  urlBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  urlLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  urlText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2563EB',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noticeBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    fontWeight: '500',
  },
  featureList: {
    width: '100%',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureBullet: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    gap: 8,
    marginTop: 8,
    ...SHADOW.card,
  },
  logoutBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
