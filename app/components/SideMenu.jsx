import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, SHADOW } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function SideMenu() {
  const { isMenuOpen, closeMenu } = useUiStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  if (!isMenuOpen) return null;

  const navigateTo = (path) => {
    closeMenu();
    setTimeout(() => {
      router.push(path);
    }, 150);
  };

  const getRoleHomePath = () => {
    switch (user?.role) {
      case 'collector':
        return '/(collector)/round';
      case 'bmc_collector':
        return '/(bmc-collector)/dashboard';
      case 'society_representative':
        return '/(society-representative)/society';
      case 'officer':
        return '/(officer)/portal';
      case 'citizen':
      default:
        return '/(tabs)/home';
    }
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'collector':
        return 'Internal Collector';
      case 'bmc_collector':
        return 'BMC Collector';
      case 'society_representative':
        return 'Society Representative';
      case 'officer':
        return `Ward Officer (${user?.wardId || 'N-WARD'})`;
      case 'citizen':
      default:
        return 'Citizen Household';
    }
  };

  const configuredDashboardUrl = process.env.EXPO_PUBLIC_DASHBOARD_URL?.trim();

  return (
    <Modal visible={isMenuOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeMenu} />
        
        <View style={styles.menuContainer}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            
            <View style={styles.header}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={{ fontSize: 24 }}>
                    {user?.role === 'officer' ? '🏛️' : user?.role === 'society_representative' ? '🏢' : user?.role === 'bmc_collector' ? '🚛' : user?.role === 'collector' ? '♻️' : '🧑🏽'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
                  <Text style={styles.userRoleBadge}>{getRoleBadge()}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeMenu} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              {/* Home navigation scoped to current role */}
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo(getRoleHomePath())}>
                <Ionicons name="home-outline" size={22} color={COLORS.text} style={styles.menuIcon} />
                <Text style={styles.menuText}>Home</Text>
              </TouchableOpacity>

              {/* Citizen-only menu destinations */}
              {user?.role === 'citizen' && (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/profile')}>
                    <Ionicons name="person-outline" size={22} color={COLORS.text} style={styles.menuIcon} />
                    <Text style={styles.menuText}>My Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/leaderboard')}>
                    <Ionicons name="trophy-outline" size={22} color={COLORS.text} style={styles.menuIcon} />
                    <Text style={styles.menuText}>Leaderboard</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/rewards-history')}>
                    <Ionicons name="gift-outline" size={22} color={COLORS.text} style={styles.menuIcon} />
                    <Text style={styles.menuText}>Reward History</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Officer-specific guidance */}
              {user?.role === 'officer' && (
                <View style={styles.officerGuidanceBox}>
                  <Text style={styles.officerGuidanceTitle}>🏛️ Web Dashboard</Text>
                  <Text style={styles.officerGuidanceText}>
                    Society verification and municipal oversight are conducted via the GreenPoint Web Dashboard on BMC computers.
                  </Text>
                  {configuredDashboardUrl && (
                    <Text style={styles.officerGuidanceUrl}>{configuredDashboardUrl}</Text>
                  )}
                </View>
              )}

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  closeMenu();
                  logout();
                }}
              >
                <Ionicons name="log-out-outline" size={22} color={COLORS.danger} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: COLORS.danger }]}>Log Out</Text>
              </TouchableOpacity>
            </ScrollView>
            
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuContainer: {
    width: width * 0.8,
    maxWidth: 320,
    backgroundColor: COLORS.white,
    height: '100%',
    ...SHADOW.modal,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  userRoleBadge: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  officerGuidanceBox: {
    marginVertical: 10,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  officerGuidanceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  officerGuidanceText: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  officerGuidanceUrl: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563EB',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
    marginHorizontal: 12,
  }
});
