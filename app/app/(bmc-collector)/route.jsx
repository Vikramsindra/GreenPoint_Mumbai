import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCollectionStore } from "../../store/collectionStore";
import * as api from "../../services/api";

export default function RouteScreen() {
  const router = useRouter();
  const { lastCollectionTime, clearTrigger } = useCollectionStore();

  const [collectionPoints, setCollectionPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  const fetchRoute = useCallback(async () => {
    try {
      const res = await api.getAssignedCollectionPoints();
      if (res.data?.success) {
        const points = res.data.data;
        setCollectionPoints(points);

        const completed = points.filter((p) => p.status === "completed").length;
        const pending = points.filter((p) => p.status === "pending").length;

        setStats({
          total: points.length,
          completed,
          pending,
        });
      }
    } catch (err) {
      console.error("Failed to fetch route:", err);
      Alert.alert("Error", "Failed to load route");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  // Listen for new collections and refresh route
  useEffect(() => {
    if (lastCollectionTime) {
      console.log("New collection detected, refreshing route...");
      fetchRoute();
      clearTrigger();
    }
  }, [lastCollectionTime, clearTrigger]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoute();
  }, [fetchRoute]);

  const getStatusColor = (status) => {
    return status === "completed" ? "#10b981" : "#fbbf24";
  };

  const getStatusIcon = (status) => {
    return status === "completed" ? "check-circle" : "clock-outline";
  };

  const renderPointItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.pointCard}
      onPress={() =>
        router.push({
          pathname: "/(bmc-collector)/collection-entry",
          params: { selectedPointId: item._id },
        })
      }
    >
      <View style={styles.pointHeader}>
        <View style={styles.pointInfo}>
          <View style={styles.pointNumber}>
            <Text style={styles.pointNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.pointDetails}>
            <Text style={styles.pointName}>{item.name}</Text>
            <Text style={styles.pointType}>
              {item.type.replace("_", " ").toUpperCase()}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <MaterialCommunityIcons
            name={getStatusIcon(item.status)}
            size={16}
            color="#fff"
          />
          <Text style={styles.statusText}>
            {item.status === "completed" ? "Done" : "Pending"}
          </Text>
        </View>
      </View>

      <View style={styles.pointAddress}>
        <MaterialCommunityIcons name="map-marker" size={14} color="#999" />
        <Text style={styles.addressText}>{item.address}</Text>
      </View>

      {item.contactPerson && (
        <View style={styles.contactInfo}>
          <MaterialCommunityIcons name="phone" size={14} color="#999" />
          <Text style={styles.contactText}>{item.contactPerson}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.actionButton}>
        <MaterialCommunityIcons name="plus" size={18} color="#fff" />
        <Text style={styles.actionButtonText}>
          {item.status === "completed" ? "Add Another" : "Log Collection"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: "#10b98126" }]}>
          <Text style={[styles.statNumber, { color: "#10b981" }]}>
            {stats.completed}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: "#fbbf2426" }]}>
          <Text style={[styles.statNumber, { color: "#f59e0b" }]}>
            {stats.pending}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {collectionPoints.length > 0 ? (
        <FlatList
          data={collectionPoints}
          keyExtractor={(item) => item._id}
          renderItem={renderPointItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="map-marker-off"
            size={48}
            color="#ccc"
          />
          <Text style={styles.emptyText}>No collection points assigned</Text>
          <Text style={styles.emptySubtext}>
            Contact your supervisor to get assigned collection points
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
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f0f7ff",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0d47a1",
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pointCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  pointHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pointInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pointNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0d47a1",
    justifyContent: "center",
    alignItems: "center",
  },
  pointNumberText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  pointDetails: {
    flex: 1,
  },
  pointName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  pointType: {
    fontSize: 10,
    fontWeight: "600",
    color: "#0d47a1",
    textTransform: "uppercase",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  pointAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 42,
  },
  addressText: {
    fontSize: 11,
    color: "#666",
    flex: 1,
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 42,
  },
  contactText: {
    fontSize: 11,
    color: "#666",
  },
  actionButton: {
    backgroundColor: "#0d47a1",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 42,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
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
