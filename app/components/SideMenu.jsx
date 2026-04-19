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
    // setTimeout to allow modal to close smoothly before navigating
    setTimeout(() => {
      router.push(path);
    }, 150);
  };

  return (
    <Modal visible={isMenuOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeMenu} />
        
        <View style={styles.menuContainer}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            
            <View style={styles.header}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={{ fontSize: 24 }}>🧑🏽</Text>
                </View>
                <View>
                  <Text style={styles.userName}>{user?.name || 'User'}</Text>
                  <Text style={styles.userPhone}>{user?.phone || ''}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeMenu} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/(tabs)/home')}>
                <Ionicons name="home-outline" size={22} color={COLORS.text} style={styles.menuIcon} />
                <Text style={styles.menuText}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/profile')}>
                <Ionicons name="person-outline" size={22} color={COLORS.text} style={styles.menuIcon} />
                <Text style={styles.menuText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/rewards-history')}>
                <Ionicons name="gift-outline" size={22} color={COLORS.text} style={styles.menuIcon} />
                <Text style={styles.menuText}>Reward History</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); logout(); }}>
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
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  userPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
    marginHorizontal: 12,
  }
});
