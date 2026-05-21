import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCollectionStore } from "../../store/collectionStore";
import * as api from "../../services/api";

export default function HistoryScreen() {
  const { lastCollectionTime, clearTrigger } = useCollectionStore();

  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    totalWeight: 0,
  });

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.getBMCCollectionHistory();
      if (res.data?.success) {
        const { grouped, total, totalWeight } = res.data.data;

        // Convert grouped data to SectionList format
        const sections = Object.entries(grouped).map(([date, collections]) => ({
          title: new Date(date).toLocaleDateString("en-IN", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          data: collections,
          dayCollections: collections,
        }));

        setHistoryData(sections);
        setStats({ total, totalWeight });
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Listen for new collections and refresh history
  useEffect(() => {
    if (lastCollectionTime) {
      console.log("New collection detected, refreshing history...");
      fetchHistory();
      clearTrigger();
    }
  }, [lastCollectionTime, clearTrigger]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, [fetchHistory]);

  const getWasteTypeColor = (wasteType) => {
    const colors = {
      wet: "#10b981",
      dry: "#8b5cf6",
      mixed: "#f59e0b",
      bulk: "#ef4444",
    };
    return colors[wasteType] || "#666";
  };

  const getWasteTypeIcon = (wasteType) => {
    const icons = {
      wet: "water-percent",
      dry: "leaf",
      mixed: "shuffle",
      bulk: "trash-can",
    };
    return icons[wasteType] || "help";
  };

  const renderCollectionItem = ({ item }) => (
    <View style={styles.collectionCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View
            style={[
              styles.wasteTypeIcon,
              { backgroundColor: getWasteTypeColor(item.wasteType) + "20" },
            ]}
          >
            <MaterialCommunityIcons
              name={getWasteTypeIcon(item.wasteType)}
              size={18}
              color={getWasteTypeColor(item.wasteType)}
            />
          </View>
          <View>
            <Text style={styles.collectionPointName}>
              {item.collectionPointId?.name || "Unknown Point"}
            </Text>
            <Text style={styles.collectionTime}>
              {new Date(item.timestamp).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
        <View style={styles.weightBadge}>
          <Text style={styles.weightValue}>{item.weight}</Text>
          <Text style={styles.weightUnit}>kg</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="tag" size={14} color="#999" />
          <Text style={styles.detailLabel}>
            {item.wasteType.charAt(0).toUpperCase() + item.wasteType.slice(1)}{" "}
            Waste
          </Text>
        </View>

        {item.collectionPointId?.type && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="information" size={14} color="#999" />
            <Text style={styles.detailLabel}>
              {item.collectionPointId.type.replace("_", " ").toUpperCase()}
            </Text>
          </View>
        )}

        {item.notes && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="note-text" size={14} color="#999" />
            <Text style={styles.detailLabel}>{item.notes}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <MaterialCommunityIcons
            name={item.status === "verified" ? "check-circle" : "clock-outline"}
            size={14}
            color={item.status === "verified" ? "#10b981" : "#999"}
          />
          <Text
            style={[
              styles.detailLabel,
              { color: item.status === "verified" ? "#10b981" : "#999" },
            ]}
          >
            {item.status === "verified" ? "Verified" : "Pending Verification"}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSectionHeader = ({ section: { title, dayCollections } }) => {
    const dayWeight = dayCollections.reduce((sum, c) => sum + c.weight, 0);
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionStats}>
          {dayCollections.length} collections • {dayWeight}kg
        </Text>
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
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialCommunityIcons
            name="clipboard-list"
            size={24}
            color="#0d47a1"
          />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Collections</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons
            name="weight-kilogram"
            size={24}
            color="#16a34a"
          />
          <Text style={styles.statValue}>{Math.round(stats.totalWeight)}</Text>
          <Text style={styles.statLabel}>Total Weight (kg)</Text>
        </View>
      </View>

      {historyData.length > 0 ? (
        <SectionList
          sections={historyData}
          keyExtractor={(item, index) => item._id + index}
          renderItem={renderCollectionItem}
          renderSectionHeader={renderSectionHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="history" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No collections yet</Text>
          <Text style={styles.emptySubtext}>
            Start logging waste collections to see them here
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: "#999",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },
  sectionStats: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  collectionCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  wasteTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  collectionPointName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  collectionTime: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  weightBadge: {
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  weightValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0d47a1",
  },
  weightUnit: {
    fontSize: 9,
    color: "#0d47a1",
    fontWeight: "600",
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
});
