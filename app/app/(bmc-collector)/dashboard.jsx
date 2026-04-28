import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import * as api from "../../services/api";

const { width } = Dimensions.get("window");

export default function BMCDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [stats, setStats] = useState({
    totalWeight: 0,
    pointsCovered: 0,
    pendingPoints: 0,
    collectionsToday: 0,
  });
  const [societyStats, setSocietyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch today's collections stats
      const collectionsRes = await api.getBMCCollections({ filter: "today" });
      if (collectionsRes.data?.success) {
        const { todayStats } = collectionsRes.data.data;
        setStats((prev) => ({
          ...prev,
          totalWeight: todayStats.totalWeight,
          pointsCovered: todayStats.pointsCovered,
          collectionsToday: todayStats.collectionsLogged,
        }));
      }

      // Fetch assigned collection points
      const pointsRes = await api.getAssignedCollectionPoints();
      if (pointsRes.data?.success) {
        const points = pointsRes.data.data;
        const pending = points.filter((p) => p.status === "pending").length;
        setStats((prev) => ({
          ...prev,
          pendingPoints: pending,
        }));

        // Group by society and create society-level stats
        const societyMap = {};
        points.forEach((point) => {
          if (point.type === "society") {
            if (!societyMap[point.name]) {
              societyMap[point.name] = {
                name: point.name,
                total: 0,
                completed: 0,
                pending: 0,
                address: point.address,
                contactPerson: point.contactPerson,
                contactPhone: point.contactPhone,
                lastCollected: point.lastCollectionAt,
              };
            }
            societyMap[point.name].total += 1;
            if (point.status === "pending") {
              societyMap[point.name].pending += 1;
            } else {
              societyMap[point.name].completed += 1;
            }
          }
        });

        // Convert to array and sort by completion percentage
        const societies = Object.values(societyMap).sort((a, b) => {
          const aPercent = (a.completed / a.total) * 100;
          const bPercent = (b.completed / b.total) * 100;
          return bPercent - aPercent;
        });

        setSocietyStats(societies);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const renderSocietyCard = ({ item, index }) => {
    const completionPercent = (item.completed / item.total) * 100;
    const rank = index + 1;

    return (
      <View style={styles.societyCard}>
        {/* Rank Badge */}
        <View
          style={[
            styles.rankBadge,
            rank === 1
              ? styles.rankGold
              : rank === 2
              ? styles.rankSilver
              : rank === 3
              ? styles.rankBronze
              : styles.rankDefault,
          ]}
        >
          <Text
            style={[
              styles.rankText,
              (rank <= 3 ? { color: "#fff" } : { color: "#6B7280" }),
            ]}
          >
            #{rank}
          </Text>
        </View>

        <View style={styles.societyContent}>
          {/* Society Name and Address */}
          <View style={styles.societyHeader}>
            <Text style={styles.societyName}>{item.name}</Text>
            <View style={styles.completionBadge}>
              <Text style={styles.completionPercent}>
                {completionPercent.toFixed(0)}%
              </Text>
            </View>
          </View>

          <Text style={styles.societyAddress}>{item.address}</Text>

          {/* Collection Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${completionPercent}%` },
                ]}
              />
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statSmall}>
              <MaterialCommunityIcons
                name="check-circle"
                size={16}
                color="#16a34a"
              />
              <Text style={styles.statText}>
                {item.completed} Completed
              </Text>
            </View>
            <View style={styles.statSmall}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color="#f59e0b"
              />
              <Text style={styles.statText}>{item.pending} Pending</Text>
            </View>
          </View>

          {/* Contact Info */}
          {item.contactPerson && (
            <View style={styles.contactRow}>
              <MaterialCommunityIcons
                name="account-outline"
                size={14}
                color="#0d47a1"
              />
              <Text style={styles.contactText}>
                {item.contactPerson}
              </Text>
            </View>
          )}

          {/* Last Collection */}
          {item.lastCollected && (
            <View style={styles.lastCollectionRow}>
              <MaterialCommunityIcons
                name="history"
                size={14}
                color="#8b5cf6"
              />
              <Text style={styles.lastCollectionText}>
                Last collected:{" "}
                {new Date(item.lastCollected).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0d47a1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, {user?.name?.split(" ")[0]}!
            </Text>
            <Text style={styles.subGreeting}>Today's Collection Summary</Text>
          </View>
          <MaterialCommunityIcons name="truck" size={32} color="#0d47a1" />
        </View>

        {/* Today's Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Total Weight Collected */}
          <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
            <View style={styles.statCardContent}>
              <MaterialCommunityIcons
                name="weight-kilogram"
                size={28}
                color="#0d47a1"
              />
              <Text style={styles.statValue}>{stats.totalWeight}</Text>
              <Text style={styles.statLabel}>kg Today</Text>
            </View>
          </TouchableOpacity>

          {/* Collection Points Covered */}
          <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
            <View style={styles.statCardContent}>
              <MaterialCommunityIcons
                name="map-marker-check"
                size={28}
                color="#16a34a"
              />
              <Text style={styles.statValue}>{stats.pointsCovered}</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>
          </TouchableOpacity>

          {/* Pending Points */}
          <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
            <View style={styles.statCardContent}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={28}
                color="#f59e0b"
              />
              <Text style={styles.statValue}>{stats.pendingPoints}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </TouchableOpacity>

          {/* Collections Logged */}
          <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
            <View style={styles.statCardContent}>
              <MaterialCommunityIcons
                name="clipboard-list"
                size={28}
                color="#8b5cf6"
              />
              <Text style={styles.statValue}>{stats.collectionsToday}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/(bmc-collector)/collection-entry")}
          >
            <View style={styles.actionContent}>
              <MaterialCommunityIcons
                name="plus-circle"
                size={24}
                color="#fff"
              />
              <Text style={styles.actionText}>Log New Collection</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/(bmc-collector)/route")}
          >
            <View style={styles.actionContent}>
              <MaterialCommunityIcons
                name="map-marker-path"
                size={24}
                color="#fff"
              />
              <Text style={styles.actionText}>View My Route</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/(bmc-collector)/history")}
          >
            <View style={styles.actionContent}>
              <MaterialCommunityIcons name="history" size={24} color="#fff" />
              <Text style={styles.actionText}>View History</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {/* Society Rankings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Society Performance</Text>
            <View style={styles.medal}>
              <MaterialCommunityIcons
                name="trophy"
                size={20}
                color="#f59e0b"
              />
            </View>
          </View>

          {societyStats.length > 0 ? (
            <FlatList
              data={societyStats}
              renderItem={renderSocietyCard}
              keyExtractor={(item) => item.name}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="home-group"
                size={48}
                color="#D1D5DB"
              />
              <Text style={styles.emptyText}>No societies assigned</Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#0d47a1",
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  subGreeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    width: (width - 32) / 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statCardContent: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  medal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    backgroundColor: "#0d47a1",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  societyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: "row",
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankGold: {
    backgroundColor: "#f59e0b",
  },
  rankSilver: {
    backgroundColor: "#e5e7eb",
  },
  rankBronze: {
    backgroundColor: "#fed7aa",
  },
  rankDefault: {
    backgroundColor: "#f3f4f6",
  },
  rankText: {
    fontWeight: "700",
    fontSize: 14,
  },
  societyContent: {
    flex: 1,
  },
  societyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  societyName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    flex: 1,
  },
  completionBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completionPercent: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0d47a1",
  },
  societyAddress: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  progressContainer: {
    marginVertical: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0d47a1",
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 8,
  },
  statSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "500",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  contactText: {
    fontSize: 12,
    color: "#0d47a1",
    fontWeight: "500",
  },
  lastCollectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  lastCollectionText: {
    fontSize: 12,
    color: "#8b5cf6",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 12,
  },
});

