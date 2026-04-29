import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
          style: "destructive",
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        
        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <Text style={{ fontSize: 32 }}>🚛</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileRole}>BMC Collector</Text>
            <Text style={styles.profilePhone}>{user?.phone}</Text>
          </View>
        </View>

        {user?.collectorId && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="identifier"
              size={18}
              color="#0d47a1"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Collector ID</Text>
              <Text style={styles.infoValue}>{user.collectorId}</Text>
            </View>
          </View>
        )}

        {user?.wardId && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="map-marker"
              size={18}
              color="#0d47a1"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Ward</Text>
              <Text style={styles.infoValue}>{user.wardId}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <MaterialCommunityIcons
            name="shield-lock"
            size={20}
            color="#0d47a1"
          />
          <Text style={styles.menuText}>Change Password</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell" size={20} color="#0d47a1" />
          <Text style={styles.menuText}>Notifications</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="information"
            size={18}
            color="#0d47a1"
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="logout"
            size={20}
            color="#fff"
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    backgroundColor: "#0d47a1",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  section: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6b7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  profileRole: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0d47a1",
    marginTop: 2,
  },
  profilePhone: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  infoRow: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 2,
  },
  menuItem: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
    flex: 1,
    marginLeft: 12,
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 12,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
