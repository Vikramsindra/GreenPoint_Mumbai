import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, SHADOW } from '../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.appBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 40 }}>🧑🏽</Text>
            </View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userPhone}>{user?.phone || ''}</Text>
          </View>

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
            
            {(user?.role === 'collector' || user?.role === 'admin') && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Collector ID</Text>
                  <Text style={styles.detailValue}>{user?.collectorId || 'N/A'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Assigned Ward</Text>
                  <Text style={styles.detailValue}>{user?.wardId || 'N/A'}</Text>
                </View>
              </>
            )}
          </View>

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
  avatarContainer: { alignItems: 'center', marginBottom: SPACING.xxl },
  avatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...SHADOW.card
  },
  userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  userPhone: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },
  
  detailCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card, marginBottom: 32
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  detailLabel: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  detailValue: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border },
  
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 12, backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 16 }
});
