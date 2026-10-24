// filepath: app/app/(bmc-collector)/collection-entry.jsx
import React, { useState, useEffect, useRef } from "react";
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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useAuthStore } from "../../store/authStore";
import { useCollectionStore } from "../../store/collectionStore";
import * as api from "../../services/api";

const OUTCOMES = {
  SEGREGATED: "SEGREGATED",
  MIXED: "MIXED",
  NO_HANDOVER: "NO_HANDOVER",
};

export default function CollectionEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const { recordCollection } = useCollectionStore();

  // Camera permissions and state
  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [isResolvingQr, setIsResolvingQr] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const isScanningRef = useRef(false);

  // Form State
  const [collectionPoints, setCollectionPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [resolvedSociety, setResolvedSociety] = useState(null);

  const [outcome, setOutcome] = useState(OUTCOMES.SEGREGATED);
  const [wasteType, setWasteType] = useState("wet");
  const [weight, setWeight] = useState("");
  const [weightBasis, setWeightBasis] = useState("ESTIMATED"); // 'ESTIMATED' | 'MEASURED'
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [showPointsModal, setShowPointsModal] = useState(false);

  // Manual entry toggle
  const [manualEntry, setManualEntry] = useState(false);
  const [manualPointName, setManualPointName] = useState("");

  // Saved Receipt Modal
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Client-generated Request ID for Idempotency
  const requestIdRef = useRef(`req-bmc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);

  const wasteTypes = ["wet", "dry", "mixed", "bulk"];

  useEffect(() => {
    fetchCollectionPoints();
  }, []);

  // If navigated with ?mode=scan, open camera scanner immediately
  useEffect(() => {
    if (params.mode === "scan") {
      setShowScanner(true);
    }
  }, [params.mode]);

  const fetchCollectionPoints = async () => {
    try {
      setPointsLoading(true);
      const res = await api.getAssignedCollectionPoints();
      if (res.data?.success) {
        setCollectionPoints(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load collection points:", err);
    } finally {
      setPointsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Camera Barcode Handler (Debounced)
  // -------------------------------------------------------------
  const handleBarCodeScanned = async ({ data }) => {
    if (isScanningRef.current || isResolvingQr) return;
    isScanningRef.current = true;

    const scannedText = (data || "").trim();

    // Guidance if household QR scanned
    if (scannedText.startsWith("GP-HH-")) {
      Alert.alert(
        "Household QR Code Detected",
        "Scan the society collection QR. Individual household QR codes cannot be collected by municipal bulk collectors.",
        [
          {
            text: "OK",
            onPress: () => {
              isScanningRef.current = false;
            },
          },
        ]
      );
      return;
    }

    if (!scannedText.startsWith("GP-SOC-")) {
      Alert.alert(
        "Invalid QR Code",
        "Please scan a valid GreenPoint Society Collection QR code (starts with GP-SOC-).",
        [
          {
            text: "Try Again",
            onPress: () => {
              isScanningRef.current = false;
            },
          },
        ]
      );
      return;
    }

    // Resolve via backend
    setIsResolvingQr(true);
    try {
      const res = await api.resolveSocietyQr(scannedText);
      if (res.success && res.data) {
        setShowScanner(false);
        setResolvedSociety(res.data);
        setSelectedPoint({
          _id: res.data.collectionPointId,
          name: res.data.societyName,
          address: res.data.address,
          wardId: res.data.wardId,
          type: "society",
        });
        setManualEntry(false);
        setManualPointName("");
        // Reset request ID for new scanned entry
        requestIdRef.current = `req-bmc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      } else {
        Alert.alert("Verification Failed", res.message || "Could not verify society QR");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to verify society QR";
      Alert.alert("Access Denied / Verification Error", msg, [
        {
          text: "OK",
          onPress: () => {
            isScanningRef.current = false;
          },
        },
      ]);
    } finally {
      setIsResolvingQr(false);
      setTimeout(() => {
        isScanningRef.current = false;
      }, 1000);
    }
  };

  // -------------------------------------------------------------
  // Point Selection from List
  // -------------------------------------------------------------
  const handleSelectPointFromList = (point) => {
    setSelectedPoint(point);
    setManualEntry(false);
    setManualPointName("");
    setShowPointsModal(false);

    // If linked society exists on this point
    if (point.societyId) {
      const soc = point.societyId;
      setResolvedSociety({
        societyId: soc._id || soc,
        societyName: soc.name || point.name,
        address: soc.address || point.address,
        pointsBalance: soc.pointsBalance || 0,
        alreadyAwardedToday: false,
      });
    } else {
      setResolvedSociety(null);
    }

    // Reset request ID for fresh selection
    requestIdRef.current = `req-bmc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  };

  // -------------------------------------------------------------
  // Form Submission
  // -------------------------------------------------------------
  const handleSubmit = async () => {
    if (!selectedPoint && !manualPointName) {
      Alert.alert("Missing Point", "Please scan a society QR or select a collection point.");
      return;
    }

    // Validate contradictory inputs
    if (outcome === OUTCOMES.SEGREGATED && wasteType === "mixed") {
      Alert.alert(
        "Contradictory Handover",
        "A handover outcome cannot be marked SEGREGATED when the waste stream is mixed. Please choose wet, dry, or bulk, or change outcome to MIXED."
      );
      return;
    }

    // Validate NO_HANDOVER requirements
    if (outcome === OUTCOMES.NO_HANDOVER) {
      if (!notes || notes.trim().length < 3) {
        Alert.alert(
          "Explanatory Note Required",
          "Please describe in the notes why the waste handover did not take place (at least 3 characters)."
        );
        return;
      }
    } else {
      // For actual pickups, weight must be positive
      const parsedWeight = parseFloat(weight);
      if (isNaN(parsedWeight) || parsedWeight <= 0) {
        Alert.alert("Invalid Weight", "Please enter a valid positive weight in kilograms.");
        return;
      }
      if (!wasteType) {
        Alert.alert("Waste Stream Required", "Please select a waste stream category.");
        return;
      }
    }

    setLoading(true);

    // Capture actual device location if permitted (do not fake 0,0)
    let deviceLocation = { lat: null, lng: null, isAvailable: false };
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          deviceLocation = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            isAvailable: true,
          };
        }
      }
    } catch (locErr) {
      // Permission denied or GPS unavailable: does not block the demonstration
      deviceLocation = { lat: null, lng: null, isAvailable: false };
    }

    const payload = {
      collectionPointId: selectedPoint ? selectedPoint._id : null,
      societyId: resolvedSociety ? resolvedSociety.societyId : null,
      outcome,
      wasteType: outcome === OUTCOMES.NO_HANDOVER ? "mixed" : wasteType,
      weight: outcome === OUTCOMES.NO_HANDOVER ? 0 : parseFloat(weight),
      weightBasis: outcome === OUTCOMES.NO_HANDOVER ? "ESTIMATED" : weightBasis,
      notes: notes.trim(),
      manualPointName: manualEntry ? manualPointName.trim() : "",
      deviceLocation,
      requestId: requestIdRef.current,
    };

    try {
      const res = await api.logBMCCollection(payload);
      if (res.data?.success) {
        recordCollection();

        // Show receipt
        setReceiptData({
          collection: res.data.data,
          pointsAwarded: res.data.pointsAwarded || 0,
          pointsReason: res.data.pointsReason || "",
          societyName: resolvedSociety?.societyName || selectedPoint?.name || manualPointName,
          outcome,
          weight: outcome === OUTCOMES.NO_HANDOVER ? 0 : parseFloat(weight),
          weightBasis,
          wasteType,
          isDuplicate: res.data.isDuplicate || false,
        });
        setShowReceiptModal(true);

        // Reset form
        setSelectedPoint(null);
        setResolvedSociety(null);
        setManualPointName("");
        setManualEntry(false);
        setWeight("");
        setNotes("");
        setOutcome(OUTCOMES.SEGREGATED);
        setWasteType("wet");
        requestIdRef.current = `req-bmc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        fetchCollectionPoints();
      } else {
        Alert.alert("Submission Failed", res.data?.message || "Failed to log handover");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to log collection";
      Alert.alert("Error Logging Handover", msg);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Camera Scanner View
  // -------------------------------------------------------------
  if (showScanner) {
    if (!permission) {
      return (
        <SafeAreaView style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0d47a1" />
        </SafeAreaView>
      );
    }

    if (!permission.granted) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.permissionBox}>
            <MaterialCommunityIcons name="camera-off" size={48} color="#ef4444" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionSubtitle}>
              GreenPoint needs camera access to scan society collection QR codes (GP-SOC-...).
            </Text>
            <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
              <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowScanner(false)}
            >
              <Text style={styles.cancelBtnText}>Select Society from List Instead</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={handleBarCodeScanned}
        />

        {/* Overlay Frame */}
        <SafeAreaView style={styles.scannerOverlay}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.scannerCloseBtn}
              onPress={() => setShowScanner(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerHeaderTitle}>Scan Society QR</Text>
            <TouchableOpacity
              style={styles.scannerTorchBtn}
              onPress={() => setTorchOn(!torchOn)}
            >
              <MaterialCommunityIcons
                name={torchOn ? "flash" : "flash-off"}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.scannerMiddle}>
            <View style={styles.scanTargetBox}>
              <View style={[styles.cornerTL, styles.corner]} />
              <View style={[styles.cornerTR, styles.corner]} />
              <View style={[styles.cornerBL, styles.corner]} />
              <View style={[styles.cornerBR, styles.corner]} />
              {isResolvingQr && (
                <View style={styles.resolvingBox}>
                  <ActivityIndicator size="large" color="#10b981" />
                  <Text style={styles.resolvingText}>Verifying Society QR...</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.scannerFooter}>
            <Text style={styles.scannerInstructions}>
              Align the society collection QR code (GP-SOC-...) inside the frame
            </Text>
            <TouchableOpacity
              style={styles.manualFallbackBtn}
              onPress={() => {
                setShowScanner(false);
                setShowPointsModal(true);
              }}
            >
              <Text style={styles.manualFallbackText}>
                Cannot scan? Select from assigned list
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // -------------------------------------------------------------
  // Main Entry Screen
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Municipal Waste Handover</Text>
          <Text style={styles.subtitle}>Record aggregated society waste collection</Text>
        </View>

        {/* Quick QR Scan Action Button */}
        <TouchableOpacity
          style={styles.scanActionCard}
          onPress={() => setShowScanner(true)}
          activeOpacity={0.8}
        >
          <View style={styles.scanActionIconBox}>
            <MaterialCommunityIcons name="qrcode-scan" size={28} color="#fff" />
          </View>
          <View style={styles.scanActionTextBox}>
            <Text style={styles.scanActionTitle}>Scan Society Collection QR</Text>
            <Text style={styles.scanActionSubtitle}>
              Scan GP-SOC-... code to verify assignment and credit society points
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#10b981" />
        </TouchableOpacity>

        {/* Form Body */}
        <View style={styles.form}>
          {/* Target Society / Collection Point Section */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Society / Collection Point *</Text>

            {resolvedSociety ? (
              <View style={styles.resolvedSocietyBox}>
                <View style={styles.resolvedHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resolvedName}>
                      {resolvedSociety.societyName}
                    </Text>
                    <Text style={styles.resolvedAddress}>
                      {resolvedSociety.address}
                    </Text>
                  </View>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓ VERIFIED</Text>
                  </View>
                </View>

                {/* Society Points Info */}
                <View style={styles.societyRewardInfo}>
                  <MaterialCommunityIcons name="wallet-giftcard" size={16} color="#059669" />
                  <Text style={styles.societyRewardText}>
                    Society Wallet: <Text style={{ fontWeight: "700" }}>{resolvedSociety.pointsBalance || 0} pts</Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.changePointBtn}
                  onPress={() => {
                    setResolvedSociety(null);
                    setSelectedPoint(null);
                  }}
                >
                  <Text style={styles.changePointText}>Change Society / Point</Text>
                </TouchableOpacity>
              </View>
            ) : !manualEntry ? (
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  selectedPoint && styles.selectButtonActive,
                ]}
                onPress={() => setShowPointsModal(true)}
              >
                <View style={styles.selectButtonContent}>
                  <MaterialCommunityIcons
                    name={selectedPoint ? "map-marker-check" : "map-marker-outline"}
                    size={20}
                    color={selectedPoint ? "#0d47a1" : "#999"}
                  />
                  <Text
                    style={[
                      styles.selectButtonText,
                      !selectedPoint && styles.placeholder,
                    ]}
                  >
                    {selectedPoint ? selectedPoint.name : "Select assigned collection point"}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>
            ) : (
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="pencil" size={20} color="#999" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter society / collection point name"
                  placeholderTextColor="#ccc"
                  value={manualPointName}
                  onChangeText={setManualPointName}
                />
              </View>
            )}

            {/* Toggle Manual Entry */}
            {!resolvedSociety && (
              <TouchableOpacity
                style={styles.toggleManualButton}
                onPress={() => {
                  setManualEntry(!manualEntry);
                  setSelectedPoint(null);
                  setManualPointName("");
                }}
              >
                <MaterialCommunityIcons
                  name={manualEntry ? "format-list-bulleted" : "pencil"}
                  size={16}
                  color="#0d47a1"
                />
                <Text style={styles.toggleManualText}>
                  {manualEntry ? "Select from assigned list" : "Enter unassigned point manually"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Handover Outcome Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Handover Outcome *</Text>
            <View style={styles.outcomeRow}>
              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  outcome === OUTCOMES.SEGREGATED && styles.outcomeBtnSegregatedActive,
                ]}
                onPress={() => {
                  setOutcome(OUTCOMES.SEGREGATED);
                  if (wasteType === "mixed") setWasteType("wet");
                }}
              >
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={20}
                  color={outcome === OUTCOMES.SEGREGATED ? "#fff" : "#059669"}
                />
                <Text
                  style={[
                    styles.outcomeText,
                    outcome === OUTCOMES.SEGREGATED && styles.outcomeTextActive,
                  ]}
                >
                  Segregated
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  outcome === OUTCOMES.MIXED && styles.outcomeBtnMixedActive,
                ]}
                onPress={() => {
                  setOutcome(OUTCOMES.MIXED);
                  setWasteType("mixed");
                }}
              >
                <MaterialCommunityIcons
                  name="alert"
                  size={20}
                  color={outcome === OUTCOMES.MIXED ? "#fff" : "#d97706"}
                />
                <Text
                  style={[
                    styles.outcomeText,
                    outcome === OUTCOMES.MIXED && styles.outcomeTextActive,
                  ]}
                >
                  Mixed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outcomeBtn,
                  outcome === OUTCOMES.NO_HANDOVER && styles.outcomeBtnNoActive,
                ]}
                onPress={() => {
                  setOutcome(OUTCOMES.NO_HANDOVER);
                  setWeight("0");
                }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={outcome === OUTCOMES.NO_HANDOVER ? "#fff" : "#dc2626"}
                />
                <Text
                  style={[
                    styles.outcomeText,
                    outcome === OUTCOMES.NO_HANDOVER && styles.outcomeTextActive,
                  ]}
                >
                  No Handover
                </Text>
              </TouchableOpacity>
            </View>

            {/* Outcome Guidance Banner */}
            <View
              style={[
                styles.outcomeHintBox,
                outcome === OUTCOMES.SEGREGATED && styles.outcomeHintSegregated,
                outcome === OUTCOMES.MIXED && styles.outcomeHintMixed,
                outcome === OUTCOMES.NO_HANDOVER && styles.outcomeHintNo,
              ]}
            >
              {outcome === OUTCOMES.SEGREGATED && (
                <Text style={styles.outcomeHintText}>
                  ⭐ Segregated handovers are eligible for 10 society reward points (once per day).
                </Text>
              )}
              {outcome === OUTCOMES.MIXED && (
                <Text style={styles.outcomeHintText}>
                  ⚠️ Mixed waste handover awards 0 society points.
                </Text>
              )}
              {outcome === OUTCOMES.NO_HANDOVER && (
                <Text style={styles.outcomeHintText}>
                  ✕ Records an attempted visit. Does not mark collection complete. Reason note required.
                </Text>
              )}
            </View>
          </View>

          {/* Waste Type / Stream (Only for actual pickups) */}
          {outcome !== OUTCOMES.NO_HANDOVER && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Waste Stream *</Text>
              <View style={styles.wasteTypeGrid}>
                {wasteTypes.map((type) => {
                  const isMixedDisabled = outcome === OUTCOMES.SEGREGATED && type === "mixed";
                  return (
                    <TouchableOpacity
                      key={type}
                      disabled={isMixedDisabled}
                      style={[
                        styles.wasteTypeButton,
                        wasteType === type && styles.wasteTypeButtonActive,
                        isMixedDisabled && styles.wasteTypeButtonDisabled,
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
                        size={22}
                        color={
                          isMixedDisabled
                            ? "#bbb"
                            : wasteType === type
                            ? "#fff"
                            : "#666"
                        }
                      />
                      <Text
                        style={[
                          styles.wasteTypeLabel,
                          wasteType === type && styles.wasteTypeLabelActive,
                          isMixedDisabled && styles.wasteTypeLabelDisabled,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Weight & Weight Basis (Only for actual pickups) */}
          {outcome !== OUTCOMES.NO_HANDOVER && (
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Weight (kg) *</Text>
                <View style={styles.basisToggle}>
                  <TouchableOpacity
                    style={[
                      styles.basisBtn,
                      weightBasis === "ESTIMATED" && styles.basisBtnActive,
                    ]}
                    onPress={() => setWeightBasis("ESTIMATED")}
                  >
                    <Text
                      style={[
                        styles.basisText,
                        weightBasis === "ESTIMATED" && styles.basisTextActive,
                      ]}
                    >
                      Estimated
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.basisBtn,
                      weightBasis === "MEASURED" && styles.basisBtnActive,
                    ]}
                    onPress={() => setWeightBasis("MEASURED")}
                  >
                    <Text
                      style={[
                        styles.basisText,
                        weightBasis === "MEASURED" && styles.basisTextActive,
                      ]}
                    >
                      Measured
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="weight-kilogram" size={20} color="#999" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 45.5"
                  placeholderTextColor="#ccc"
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                />
                <Text style={styles.unitText}>KG</Text>
              </View>
            </View>
          )}

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {outcome === OUTCOMES.NO_HANDOVER ? "Reason for No Handover * (Required)" : "Operational Notes (Optional)"}
            </Text>
            <TextInput
              style={[styles.input, styles.textAreaInput]}
              placeholder={
                outcome === OUTCOMES.NO_HANDOVER
                  ? "Describe why waste handover could not be completed (e.g. gates locked, bins empty, representative unavailable)"
                  : "Add notes on segregation quality, bin conditions, or vehicle handover..."
              }
              placeholderTextColor="#ccc"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.submitContent}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.submitText}>Save & Log Handover</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Select Collection Point Modal */}
      <Modal
        visible={showPointsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPointsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Assigned Society</Text>
              <TouchableOpacity onPress={() => setShowPointsModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[
                { _id: "manual", name: "📝 Enter Manually (No Reward)", isManual: true },
                ...collectionPoints,
              ]}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                if (item.isManual) {
                  return (
                    <TouchableOpacity
                      style={[styles.pointItem, styles.manualEntryItem]}
                      onPress={() => {
                        setManualEntry(true);
                        setSelectedPoint(null);
                        setResolvedSociety(null);
                        setShowPointsModal(false);
                      }}
                    >
                      <View style={styles.pointItemContent}>
                        <View>
                          <Text style={[styles.pointName, styles.manualEntryText]}>
                            {item.name}
                          </Text>
                          <Text style={styles.pointType}>
                            Unassigned operational entry (0 society points)
                          </Text>
                        </View>
                      </View>
                      <MaterialCommunityIcons name="pencil" size={20} color="#0d47a1" />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    style={styles.pointItem}
                    onPress={() => handleSelectPointFromList(item)}
                  >
                    <View style={styles.pointItemContent}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pointName}>{item.name}</Text>
                        <Text style={styles.pointType}>
                          {item.type?.replace("_", " ").toUpperCase() || "POINT"}
                        </Text>
                        <Text style={styles.pointAddress} numberOfLines={1}>
                          {item.address || "No address provided"}
                        </Text>
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
                          {item.status === "completed" ? "Done Today" : "Pending"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="map-marker-off" size={40} color="#ccc" />
                  <Text style={styles.emptyText}>No assigned collection points</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Saved Receipt Modal */}
      <Modal
        visible={showReceiptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.receiptCard}>
            <View style={styles.receiptTopIconBox}>
              <MaterialCommunityIcons name="check-circle" size={48} color="#10b981" />
            </View>

            <Text style={styles.receiptHeading}>Handover Recorded</Text>
            <Text style={styles.receiptSubheading}>
              Municipal Collection Receipt Generated
            </Text>

            {receiptData && (
              <View style={styles.receiptDetailsBox}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Society / Location</Text>
                  <Text style={styles.receiptValue}>{receiptData.societyName}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Outcome</Text>
                  <View
                    style={[
                      styles.receiptBadge,
                      receiptData.outcome === OUTCOMES.SEGREGATED && { backgroundColor: "#ecfdf5" },
                      receiptData.outcome === OUTCOMES.MIXED && { backgroundColor: "#fffbeb" },
                      receiptData.outcome === OUTCOMES.NO_HANDOVER && { backgroundColor: "#fef2f2" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.receiptBadgeText,
                        receiptData.outcome === OUTCOMES.SEGREGATED && { color: "#047857" },
                        receiptData.outcome === OUTCOMES.MIXED && { color: "#b45309" },
                        receiptData.outcome === OUTCOMES.NO_HANDOVER && { color: "#b91c1c" },
                      ]}
                    >
                      {receiptData.outcome}
                    </Text>
                  </View>
                </View>

                {receiptData.outcome !== OUTCOMES.NO_HANDOVER && (
                  <>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Waste Stream</Text>
                      <Text style={styles.receiptValue}>
                        {receiptData.wasteType?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Weight</Text>
                      <Text style={styles.receiptValue}>
                        {receiptData.weight} kg ({receiptData.weightBasis})
                      </Text>
                    </View>
                  </>
                )}

                <View style={[styles.receiptRow, styles.receiptPointsRow]}>
                  <Text style={styles.receiptLabel}>Society Reward</Text>
                  <Text
                    style={[
                      styles.receiptPointsValue,
                      receiptData.pointsAwarded > 0 ? { color: "#047857" } : { color: "#6b7280" },
                    ]}
                  >
                    {receiptData.pointsAwarded > 0
                      ? `+${receiptData.pointsAwarded} pts`
                      : "0 pts"}
                  </Text>
                </View>

                <View style={styles.receiptReasonBox}>
                  <Text style={styles.receiptReasonText}>
                    {receiptData.pointsReason || "Handover processed"}
                  </Text>
                </View>

                <Text style={styles.receiptDisclaimer}>
                  ℹ️ Society points credited directly to society wallet. Officer municipal verification remains pending.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.receiptDoneBtn}
              onPress={() => {
                setShowReceiptModal(false);
                router.push("/(bmc-collector)/dashboard");
              }}
            >
              <Text style={styles.receiptDoneBtnText}>Done / Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  scanActionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
  },
  scanActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  scanActionTextBox: {
    flex: 1,
  },
  scanActionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#065f46",
  },
  scanActionSubtitle: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  basisToggle: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    padding: 2,
  },
  basisBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  basisBtnActive: {
    backgroundColor: "#0d47a1",
  },
  basisText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  basisTextActive: {
    color: "#fff",
  },
  resolvedSocietyBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    padding: 14,
  },
  resolvedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  resolvedName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#166534",
  },
  resolvedAddress: {
    fontSize: 12,
    color: "#15803d",
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803d",
  },
  societyRewardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#dcfce7",
  },
  societyRewardText: {
    fontSize: 12,
    color: "#166534",
  },
  changePointBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  changePointText: {
    fontSize: 12,
    color: "#0d47a1",
    fontWeight: "600",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
  },
  selectButtonActive: {
    borderColor: "#0d47a1",
    backgroundColor: "#f8fafc",
  },
  selectButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  selectButtonText: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },
  placeholder: {
    color: "#94a3b8",
  },
  toggleManualButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  toggleManualText: {
    fontSize: 12,
    color: "#0d47a1",
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: "#1e293b",
  },
  unitText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  textAreaInput: {
    minHeight: 70,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
  },
  outcomeRow: {
    flexDirection: "row",
    gap: 8,
  },
  outcomeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  outcomeBtnSegregatedActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  outcomeBtnMixedActive: {
    backgroundColor: "#d97706",
    borderColor: "#d97706",
  },
  outcomeBtnNoActive: {
    backgroundColor: "#dc2626",
    borderColor: "#dc2626",
  },
  outcomeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  outcomeTextActive: {
    color: "#fff",
  },
  outcomeHintBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  outcomeHintSegregated: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  outcomeHintMixed: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  outcomeHintNo: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  outcomeHintText: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16,
  },
  wasteTypeGrid: {
    flexDirection: "row",
    gap: 8,
  },
  wasteTypeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4,
  },
  wasteTypeButtonActive: {
    backgroundColor: "#0d47a1",
    borderColor: "#0d47a1",
  },
  wasteTypeButtonDisabled: {
    opacity: 0.35,
    backgroundColor: "#f1f5f9",
  },
  wasteTypeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  wasteTypeLabelActive: {
    color: "#fff",
  },
  wasteTypeLabelDisabled: {
    color: "#94a3b8",
  },
  submitButton: {
    backgroundColor: "#0d47a1",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    elevation: 2,
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
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0f172a",
  },
  pointItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  manualEntryItem: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderBottomWidth: 0,
  },
  manualEntryText: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  pointItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  pointType: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  pointAddress: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  emptyState: {
    padding: 30,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 8,
  },

  // Scanner View
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  scannerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerTorchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerHeaderTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  scannerMiddle: {
    alignItems: "center",
    justifyContent: "center",
  },
  scanTargetBox: {
    width: 250,
    height: 250,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#10b981",
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  resolvingBox: {
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  resolvingText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
  scannerFooter: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    alignItems: "center",
  },
  scannerInstructions: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manualFallbackBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  manualFallbackText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  permissionBox: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 12,
  },
  permissionSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  grantBtn: {
    backgroundColor: "#0d47a1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  grantBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: "#64748b",
    fontSize: 13,
  },

  // Receipt Modal
  receiptCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: "center",
  },
  receiptTopIconBox: {
    marginBottom: 10,
  },
  receiptHeading: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#0f172a",
  },
  receiptSubheading: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    marginBottom: 16,
  },
  receiptDetailsBox: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 18,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  receiptLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
  },
  receiptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  receiptBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  receiptPointsRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    marginTop: 4,
    paddingTop: 8,
  },
  receiptPointsValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  receiptReasonBox: {
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
  receiptReasonText: {
    fontSize: 11,
    color: "#334155",
    fontStyle: "italic",
    textAlign: "center",
  },
  receiptDisclaimer: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 14,
  },
  receiptDoneBtn: {
    backgroundColor: "#0d47a1",
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  receiptDoneBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
