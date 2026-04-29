import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import * as api from "../../services/api";

export default function CollectionEntryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [collectionPoints, setCollectionPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [wasteType, setWasteType] = useState(null);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [showPointsModal, setShowPointsModal] = useState(false);

  const wasteTypes = ["wet", "dry", "mixed", "bulk"];

  useEffect(() => {
    fetchCollectionPoints();
  }, []);

  const fetchCollectionPoints = async () => {
    try {
      const res = await api.getAssignedCollectionPoints();
      if (res.data?.success) {
        setCollectionPoints(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch collection points:", err);
      Alert.alert("Error", "Failed to load collection points");
    } finally {
      setPointsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPoint) {
      Alert.alert("Error", "Please select a collection point");
      return;
    }
    if (!wasteType) {
      Alert.alert("Error", "Please select waste type");
      return;
    }
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert("Error", "Please enter valid weight (kg)");
      return;
    }

    setLoading(true);
    try {
      const res = await api.logBMCCollection({
        collectionPointId: selectedPoint._id,
        wasteType,
        weight: parseFloat(weight),
        notes,
      });

      if (res.data?.success) {
        Alert.alert("Success", "Collection logged successfully!");
        // Reset form
        setSelectedPoint(null);
        setWasteType(null);
        setWeight("");
        setNotes("");
        // Refresh collection points to update status
        fetchCollectionPoints();
      } else {
        Alert.alert("Error", res.data?.message || "Failed to log collection");
      }
    } catch (err) {
      console.error("Error logging collection:", err);
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to log collection",
      );
    } finally {
      setLoading(false);
    }
  };

  if (pointsLoading) {
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
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Log Collection</Text>
          <Text style={styles.subtitle}>Add a new waste collection entry</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Collection Point Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Collection Point *</Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                selectedPoint && styles.selectButtonActive,
              ]}
              onPress={() => setShowPointsModal(true)}
            >
              <View style={styles.selectButtonContent}>
                <MaterialCommunityIcons
                  name={
                    selectedPoint ? "map-marker-check" : "map-marker-outline"
                  }
                  size={20}
                  color={selectedPoint ? "#0d47a1" : "#999"}
                />
                <Text
                  style={[
                    styles.selectButtonText,
                    !selectedPoint && styles.placeholder,
                  ]}
                >
                  {selectedPoint
                    ? selectedPoint.name
                    : "Select collection point"}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#999"
              />
            </TouchableOpacity>
            {selectedPoint && (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedLabel}>
                  {selectedPoint.type.replace("_", " ").toUpperCase()}
                </Text>
                <Text style={styles.selectedAddress}>
                  {selectedPoint.address}
                </Text>
              </View>
            )}
          </View>

          {/* Waste Type Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Waste Type *</Text>
            <View style={styles.wasteTypeGrid}>
              {wasteTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.wasteTypeButton,
                    wasteType === type && styles.wasteTypeButtonActive,
                  ]}
                  onPress={() => setWasteType(type)}
                >
                  <MaterialCommunityIcons
                    name={
                      type === "wet"
                        ? "water-percent"
                        : type === "dry"
                          ? "leaf"
                          : type === "mixed"
                            ? "shuffle"
                            : "trash-can"
                    }
                    size={24}
                    color={wasteType === type ? "#fff" : "#666"}
                  />
                  <Text
                    style={[
                      styles.wasteTypeLabel,
                      wasteType === type && styles.wasteTypeLabelActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Weight Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Weight (kg) *</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="weight-kilogram"
                size={20}
                color="#999"
              />
              <TextInput
                style={styles.input}
                placeholder="Enter weight in kg"
                placeholderTextColor="#ccc"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textAreaInput]}
              placeholder="Add any additional notes..."
              placeholderTextColor="#ccc"
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.submitContent}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.submitText}>Log Collection</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Points Modal */}
      <Modal
        visible={showPointsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPointsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Collection Point</Text>
              <TouchableOpacity onPress={() => setShowPointsModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={collectionPoints}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pointItem}
                  onPress={() => {
                    setSelectedPoint(item);
                    setShowPointsModal(false);
                  }}
                >
                  <View style={styles.pointItemContent}>
                    <View>
                      <Text style={styles.pointName}>{item.name}</Text>
                      <Text style={styles.pointType}>
                        {item.type.replace("_", " ").toUpperCase()}
                      </Text>
                      <Text style={styles.pointAddress}>{item.address}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            item.status === "completed" ? "#10b981" : "#fbbf24",
                        },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {item.status === "completed" ? "Done" : "Pending"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="map-marker-off"
                    size={40}
                    color="#ccc"
                  />
                  <Text style={styles.emptyText}>
                    No collection points assigned
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  subtitle: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 12,
  },
  selectButtonActive: {
    borderColor: "#0d47a1",
    backgroundColor: "#f0f7ff",
  },
  selectButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectButtonText: {
    fontSize: 14,
    color: "#333",
  },
  placeholder: {
    color: "#999",
  },
  selectedInfo: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
  },
  selectedLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0d47a1",
    textTransform: "uppercase",
  },
  selectedAddress: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  wasteTypeGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  wasteTypeButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  wasteTypeButtonActive: {
    backgroundColor: "#0d47a1",
    borderColor: "#0d47a1",
  },
  wasteTypeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
  wasteTypeLabelActive: {
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: "#333",
  },
  textAreaInput: {
    height: 100,
    paddingVertical: 10,
  },
  submitButton: {
    backgroundColor: "#0d47a1",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  pointItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pointItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  pointType: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0d47a1",
    marginTop: 2,
    textTransform: "uppercase",
  },
  pointAddress: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
});
