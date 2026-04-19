// filepath: app/app/(tabs)/_layout.jsx
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SHADOW, RADIUS } from '../../constants/theme';

export default function TabLayout() {
  const { user } = useAuthStore();
  const isCitizen = user?.role === 'citizen' || !user?.role;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'leaf' : 'leaf-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: isCitizen ? 'My QR' : 'Scan',
          tabBarIcon: ({ focused }) => (
            <View style={styles.fabContainer}>
              <View style={styles.fab}>
                <Ionicons name="qr-code-outline" size={28} color={COLORS.white} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="violations"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'warning' : 'warning-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="redeem"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'gift' : 'gift-outline'} size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: 70,
    borderTopWidth: 0,
    ...SHADOW.modal,
    elevation: 8,
  },
  fabContainer: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.floating,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#F8FAFC',
  }
});
