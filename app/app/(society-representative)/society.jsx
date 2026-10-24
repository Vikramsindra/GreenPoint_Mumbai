// filepath: app/app/(society-representative)/dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import {
  getMySociety,
  submitSocietyApplication,
  getSocietyQrData,
} from "../../services/api";
import { COLORS, SPACING, SHADOW } from "../../constants/theme";

const WARDS = [
  "N-WARD",
  "S-WARD",
  "E-WARD",
  "W-WARD",
  "C-WARD",
  "H-WARD",
  "M-WARD",
  "L-WARD",
];

export default function SocietyRepresentativeDashboard() {
  const { user, logout } = useAuthStore();

  const [society, setSociety] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Application form state
  const [form, setForm] = useState({
    name: "",
    address: "",
    wardId: "N-WARD",
    registrationNumber: "",
    lat: "",
    lng: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWardPicker, setShowWardPicker] = useState(false);

  // QR Code preview for approved societies
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  // Load existing society application
  const loadSociety = useCallback(async () => {
    setError(null);
    try {
      const res = await getMySociety();
      if (res.success && res.data) {
        setSociety(res.data);
        if (res.data.registrationStatus === "APPROVED") {
          loadQr(res.data._id);
        }
      } else {
        setSociety(null);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // No society application submitted yet
        setSociety(null);
      } else {
        setError(err.response?.data?.message || err.message || "Failed to load society");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadQr = async (societyId) => {
    setIsLoadingQr(true);
    try {
      const res = await getSocietyQrData(societyId);
      if (res.success && res.qrImageUrl) {
        setQrImageUrl(res.qrImageUrl);
      }
    } catch (err) {
      console.log("Could not load QR preview:", err.message);
    } finally {
      setIsLoadingQr(false);
    }
  };

  useEffect(() => {
    loadSociety();
  }, [loadSociety]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSociety();
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name || form.name.trim().length < 2) {
      errs.name = "Society name must be at least 2 characters";
    }
    if (!form.address || form.address.trim().length < 5) {
      errs.address = "Address must be at least 5 characters";
    }
    if (!form.wardId) {
      errs.wardId = "Ward selection is required";
    }

    if (form.lat || form.lng) {
      const latNum = parseFloat(form.lat);
      const lngNum = parseFloat(form.lng);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        errs.lat = "Valid latitude between -90 and 90 required";
      }
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errs.lng = "Valid longitude between -180 and 180 required";
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitApplication = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      wardId: form.wardId.trim().toUpperCase(),
      registrationNumber: form.registrationNumber.trim() || undefined,
    };

    if (form.lat && form.lng) {
      payload.location = {
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
      };
    }

    try {
      const res = await submitSocietyApplication(payload);
      if (res.success && res.data) {
        setSociety(res.data);
      } else {
        setError(res.message || "Failed to submit society application");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Submission failed";
      setError(msg);
      if (err.response?.status === 409) {
        // Application already exists; reload
        loadSociety();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading society information...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>GreenPoint Society Portal</Text>
          <Text style={styles.headerSubtitle}>
            Representative: {user?.name} ({user?.phone})
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Error message */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STATE A: NO APPLICATION SUBMITTED YET                            */}
        {/* ---------------------------------------------------------------- */}
        {!society && (
          <View style={styles.card}>
            <View style={styles.formHeader}>
              <Text style={styles.formIcon}>🏢</Text>
              <Text style={styles.cardTitle}>Society Registration Application</Text>
              <Text style={styles.cardSubtitle}>
                Submit your housing society details for municipal verification. Your assigned Ward Officer will review and issue your collection point identity.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Society Name *</Text>
              <TextInput
                style={[styles.input, formErrors.name && styles.inputError]}
                placeholder="e.g. Sunrise Cooperative Housing Society"
                placeholderTextColor="#9CA3AF"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />
              {formErrors.name && <Text style={styles.fieldError}>{formErrors.name}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Society Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea, formErrors.address && styles.inputError]}
                placeholder="Complete street address, landmarks, postal code"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={form.address}
                onChangeText={(t) => setForm({ ...form, address: t })}
              />
              {formErrors.address && <Text style={styles.fieldError}>{formErrors.address}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Administrative Ward *</Text>
              <TouchableOpacity
                style={styles.wardPickerBtn}
                onPress={() => setShowWardPicker(!showWardPicker)}
              >
                <Text style={styles.wardPickerText}>{form.wardId}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {showWardPicker && (
                <View style={styles.wardList}>
                  {WARDS.map((w) => (
                    <TouchableOpacity
                      key={w}
                      style={[
                        styles.wardItem,
                        form.wardId === w && styles.wardItemSelected,
                      ]}
                      onPress={() => {
                        setForm({ ...form, wardId: w });
                        setShowWardPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.wardItemText,
                          form.wardId === w && styles.wardItemTextSelected,
                        ]}
                      >
                        {w}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {formErrors.wardId && <Text style={styles.fieldError}>{formErrors.wardId}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Registration Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. BOM/HSG/12345/2018"
                placeholderTextColor="#9CA3AF"
                value={form.registrationNumber}
                onChangeText={(t) => setForm({ ...form, registrationNumber: t })}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>GPS Coordinates (Optional)</Text>
              <View style={styles.coordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }, formErrors.lat && styles.inputError]}
                  placeholder="Latitude (e.g. 19.1136)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={form.lat}
                  onChangeText={(t) => setForm({ ...form, lat: t })}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }, formErrors.lng && styles.inputError]}
                  placeholder="Longitude (e.g. 72.8697)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={form.lng}
                  onChangeText={(t) => setForm({ ...form, lng: t })}
                />
              </View>
              {(formErrors.lat || formErrors.lng) && (
                <Text style={styles.fieldError}>{formErrors.lat || formErrors.lng}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmitApplication}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Society Application</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STATE B: APPLICATION SUBMITTED (PENDING, APPROVED, REJECTED)    */}
        {/* ---------------------------------------------------------------- */}
        {society && (
          <View style={styles.spaceStack}>
            {/* Society Identity Card */}
            <View style={styles.card}>
              <View style={styles.societyHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.societyTitle}>{society.name}</Text>
                  <Text style={styles.societyWard}>Ward: {society.wardId}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleRefresh}
                  style={styles.refreshIconBtn}
                  title="Refresh Status"
                >
                  <Text style={styles.refreshIconText}>🔄</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Address:</Text>
                <Text style={styles.metaValue}>{society.address}</Text>
              </View>

              {society.registrationNumber ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Reg Number:</Text>
                  <Text style={styles.metaValue}>{society.registrationNumber}</Text>
                </View>
              ) : null}

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Submitted At:</Text>
                <Text style={styles.metaValue}>
                  {new Date(society.submittedAt || society.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* PENDING STATUS CARD */}
            {society.registrationStatus === "PENDING" && (
              <View style={[styles.statusCard, styles.pendingCard]}>
                <View style={styles.statusBadgePending}>
                  <Text style={styles.statusBadgeTextPending}>● PENDING REVIEW</Text>
                </View>
                <Text style={styles.statusHeadingPending}>
                  Awaiting Ward Officer Approval
                </Text>
                <Text style={styles.statusBody}>
                  Your application has been received and is currently under review by an officer at the {society.wardId} municipal office.
                </Text>
                <Text style={styles.statusBodySubtext}>
                  Once approved, your unique Society Collection QR Identity will appear here automatically. Pull down or tap refresh to check current status.
                </Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.actionBtnOutline}>
                  <Text style={styles.actionBtnOutlineText}>🔄 Check Approval Status</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* REJECTED STATUS CARD */}
            {society.registrationStatus === "REJECTED" && (
              <View style={[styles.statusCard, styles.rejectedCard]}>
                <View style={styles.statusBadgeRejected}>
                  <Text style={styles.statusBadgeTextRejected}>● REJECTED</Text>
                </View>
                <Text style={styles.statusHeadingRejected}>
                  Application Not Approved
                </Text>

                <View style={styles.rejectionReasonBox}>
                  <Text style={styles.rejectionReasonLabel}>Reason for Decision:</Text>
                  <Text style={styles.rejectionReasonText}>
                    {society.reviewNote || "No specific reason provided."}
                  </Text>
                </View>

                {society.reviewedAt && (
                  <Text style={styles.reviewedMetaText}>
                    Decision recorded on {new Date(society.reviewedAt).toLocaleDateString()}
                  </Text>
                )}

                <View style={styles.readOnlyNoticeBox}>
                  <Text style={styles.readOnlyNoticeText}>
                    ℹ️ Correction and resubmission is not yet supported in this version. Please contact your Ward {society.wardId} office for assistance.
                  </Text>
                </View>
              </View>
            )}

            {/* APPROVED STATUS CARD & QR CODE */}
            {society.registrationStatus === "APPROVED" && (
              <View style={[styles.statusCard, styles.approvedCard]}>
                <View style={styles.statusBadgeApproved}>
                  <Text style={styles.statusBadgeTextApproved}>✓ APPROVED & ACTIVE</Text>
                </View>
                <Text style={styles.statusHeadingApproved}>
                  Municipal Waste Handover Identity
                </Text>
                <Text style={styles.approvedSubtitle}>
                  Present this QR code to BMC bulk collectors during municipal collection handovers.
                </Text>

                {/* QR Display Card */}
                <View style={styles.qrContainer}>
                  {isLoadingQr ? (
                    <View style={styles.qrLoadingBox}>
                      <ActivityIndicator size="large" color={COLORS.primary} />
                      <Text style={styles.qrLoadingText}>Generating QR display...</Text>
                    </View>
                  ) : qrImageUrl ? (
                    <Image
                      source={{ uri: qrImageUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.qrLoadingBox}>
                      <Text style={{ fontSize: 40 }}>📱</Text>
                      <Text style={styles.qrLoadingText}>QR ready</Text>
                    </View>
                  )}

                  <View style={styles.qrIdBadge}>
                    <Text style={styles.qrIdLabel}>Society QR Identifier</Text>
                    <Text style={styles.qrIdCode}>{society.qrCode}</Text>
                  </View>
                </View>

                {society.collectionPointId && (
                  <View style={styles.collectionPointInfoBox}>
                    <Text style={styles.collectionPointInfoLabel}>Linked Collection Point</Text>
                    <Text style={styles.collectionPointInfoText}>
                      Point ID: {society.collectionPointId._id || society.collectionPointId}
                    </Text>
                  </View>
                )}

                {society.reviewNote ? (
                  <Text style={styles.officerNoteText}>
                    Officer Note: "{society.reviewNote}"
                  </Text>
                ) : null}

                <TouchableOpacity onPress={handleRefresh} style={styles.refreshApprovedBtn}>
                  <Text style={styles.refreshApprovedBtnText}>🔄 Refresh Identity</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  header: {
    backgroundColor: "#15803d",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#BBF7D0",
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  scroll: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  spaceStack: {
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    ...SHADOW.card,
  },
  formHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  formIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: "#FAFAFA",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: "#FEF2F2",
  },
  fieldError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  wardPickerBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wardPickerText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#6B7280",
  },
  wardList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  wardItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  wardItemSelected: {
    backgroundColor: "#DCFCE7",
  },
  wardItemText: {
    fontSize: 14,
    color: "#374151",
  },
  wardItemTextSelected: {
    fontWeight: "700",
    color: "#15803d",
  },
  coordRow: {
    flexDirection: "row",
    gap: 10,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "500",
  },
  societyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  societyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  societyWard: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 2,
  },
  refreshIconBtn: {
    padding: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  refreshIconText: {
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  metaLabel: {
    width: 100,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  metaValue: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    ...SHADOW.card,
  },
  pendingCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
  },
  statusBadgePending: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusBadgeTextPending: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "800",
  },
  statusHeadingPending: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#92400E",
    marginBottom: 6,
  },
  statusBody: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 19,
    marginBottom: 6,
  },
  statusBodySubtext: {
    fontSize: 12,
    color: "#A16207",
    lineHeight: 17,
    marginBottom: 14,
  },
  actionBtnOutline: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#D97706",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnOutlineText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "700",
  },
  rejectedCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
  },
  statusBadgeRejected: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusBadgeTextRejected: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "800",
  },
  statusHeadingRejected: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#991B1B",
    marginBottom: 10,
  },
  rejectionReasonBox: {
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  rejectionReasonLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#7F1D1D",
    marginBottom: 2,
  },
  rejectionReasonText: {
    fontSize: 13,
    color: "#1F2937",
    lineHeight: 18,
  },
  reviewedMetaText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  readOnlyNoticeBox: {
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  readOnlyNoticeText: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 16,
  },
  approvedCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
  },
  statusBadgeApproved: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusBadgeTextApproved: {
    color: "#15803d",
    fontSize: 11,
    fontWeight: "800",
  },
  statusHeadingApproved: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 4,
  },
  approvedSubtitle: {
    fontSize: 12,
    color: "#15803d",
    marginBottom: 16,
    lineHeight: 17,
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    marginBottom: 14,
  },
  qrLoadingBox: {
    width: 220,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  qrLoadingText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 8,
  },
  qrIdBadge: {
    marginTop: 14,
    alignItems: "center",
  },
  qrIdLabel: {
    fontSize: 11,
    color: "#6B7280",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  qrIdCode: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 2,
    letterSpacing: 1,
  },
  collectionPointInfoBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  collectionPointInfoLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  collectionPointInfoText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#374151",
    marginTop: 2,
  },
  officerNoteText: {
    fontSize: 12,
    color: "#15803d",
    fontStyle: "italic",
    marginBottom: 12,
  },
  refreshApprovedBtn: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
  },
  refreshApprovedBtnText: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "700",
  },
});
