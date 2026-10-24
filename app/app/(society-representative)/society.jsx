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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import {
  getMySociety,
  submitSocietyApplication,
  getSocietyQrData,
  getSocietyMembers,
  reviewMembershipRequest,
  lookupCollectorByPhone,
  assignInternalCollector,
  getSocietyHandovers,
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

  // Task 2: Membership & Collector state
  const [membersData, setMembersData] = useState({
    pending: [],
    approved: [],
    rejected: [],
    counts: { pending: 0, approved: 0, total: 0 }
  });
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [isReviewing, setIsReviewing] = useState(false);

  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");

  // Collector assignment state
  const [collectorPhone, setCollectorPhone] = useState("");
  const [isLookingUpCollector, setIsLookingUpCollector] = useState(false);
  const [collectorLookupResult, setCollectorLookupResult] = useState(null);
  const [collectorError, setCollectorError] = useState(null);
  const [isAssigningCollector, setIsAssigningCollector] = useState(false);

  // Task 4: Society Points & Municipal Handovers state
  const [handovers, setHandovers] = useState([]);
  const [isLoadingHandovers, setIsLoadingHandovers] = useState(false);

  const loadHandovers = useCallback(async () => {
    setIsLoadingHandovers(true);
    try {
      const res = await getSocietyHandovers();
      if (res.success && res.data) {
        setHandovers(res.data.handovers || []);
        if (res.data.pointsBalance != null) {
          setSociety((prev) => (prev ? { ...prev, pointsBalance: res.data.pointsBalance } : prev));
        }
      }
    } catch (err) {
      console.log("Failed to load society handovers:", err.message);
    } finally {
      setIsLoadingHandovers(false);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    try {
      const res = await getSocietyMembers();
      if (res.success && res.data) {
        setMembersData(res.data);
      }
    } catch (err) {
      console.log("Failed to load members:", err.message);
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  // Load existing society application
  const loadSociety = useCallback(async () => {
    setError(null);
    try {
      const res = await getMySociety();
      if (res.success && res.data) {
        setSociety(res.data);
        if (res.data.registrationStatus === "APPROVED") {
          loadQr(res.data._id);
          loadMembers();
          loadHandovers();
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
  }, [loadMembers, loadHandovers]);

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

  const handleApproveRequest = async (membershipId) => {
    setIsReviewing(true);
    try {
      const res = await reviewMembershipRequest(membershipId, { decision: "APPROVED" });
      if (res.success) {
        Alert.alert("Request Approved", "Household membership approved and household QR generated.");
        loadMembers();
      }
    } catch (err) {
      Alert.alert("Approval Error", err.response?.data?.message || err.message || "Failed to approve");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleOpenReject = (reqItem) => {
    setSelectedRequest(reqItem);
    setRejectionNote("");
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionNote.trim() || rejectionNote.trim().length < 3) {
      Alert.alert("Reason Required", "Please provide a reason for rejection (at least 3 characters).");
      return;
    }
    setIsReviewing(true);
    try {
      const res = await reviewMembershipRequest(selectedRequest._id, {
        decision: "REJECTED",
        reviewNote: rejectionNote.trim()
      });
      if (res.success) {
        Alert.alert("Request Rejected", "Membership request has been marked as rejected.");
        setRejectModalVisible(false);
        setSelectedRequest(null);
        setRejectionNote("");
        loadMembers();
      }
    } catch (err) {
      Alert.alert("Rejection Error", err.response?.data?.message || err.message || "Failed to reject");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleLookupCollector = async () => {
    if (!collectorPhone || collectorPhone.trim().length !== 10) {
      setCollectorError("Please enter a valid 10-digit registered phone number");
      return;
    }
    setCollectorError(null);
    setCollectorLookupResult(null);
    setIsLookingUpCollector(true);
    try {
      const res = await lookupCollectorByPhone(collectorPhone.trim());
      if (res.success && res.data) {
        setCollectorLookupResult(res.data);
      }
    } catch (err) {
      setCollectorError(err.response?.data?.message || err.message || "Collector not found");
    } finally {
      setIsLookingUpCollector(false);
    }
  };

  const handleAssignCollector = async () => {
    if (!collectorLookupResult?.collector?.phone) return;
    setIsAssigningCollector(true);
    setCollectorError(null);
    try {
      const res = await assignInternalCollector(collectorLookupResult.collector.phone);
      if (res.success) {
        Alert.alert("Success", `Collector ${collectorLookupResult.collector.name} has been assigned to your society.`);
        setCollectorLookupResult(null);
        setCollectorPhone("");
        loadSociety();
      }
    } catch (err) {
      setCollectorError(err.response?.data?.message || err.message || "Failed to assign collector");
    } finally {
      setIsAssigningCollector(false);
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
              <>
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
                  <Text style={styles.refreshApprovedBtnText}>🔄 Refresh Identity & Balance</Text>
                </TouchableOpacity>
              </View>

              {/* -------------------------------------------------------- */}
              {/* TASK 4: SOCIETY REWARD WALLET & POINTS BALANCE           */}
              {/* -------------------------------------------------------- */}
              <View style={[styles.card, styles.societyWalletCard]}>
                <View style={styles.walletHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.walletLabel}>SOCIETY REWARD WALLET</Text>
                    <Text style={styles.walletPoints}>
                      {society.pointsBalance || 0}{" "}
                      <Text style={styles.walletPointsUnit}>PTS</Text>
                    </Text>
                  </View>
                  <View style={styles.walletIconCircle}>
                    <Text style={{ fontSize: 26 }}>🏆</Text>
                  </View>
                </View>
                <Text style={styles.walletSubtitle}>
                  Earned via verified municipal segregated waste handovers (10 pts/day max). Points belong directly to the society.
                </Text>
              </View>

              {/* -------------------------------------------------------- */}
              {/* TASK 4: MUNICIPAL WASTE HANDOVER RECEIPTS                */}
              {/* -------------------------------------------------------- */}
              <View style={[styles.card, styles.handoversCard]}>
                <View style={styles.handoversHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.handoversTitle}>Municipal Collection Receipts</Text>
                    <Text style={styles.handoversSubtitle}>
                      Aggregate waste handovers inspected by BMC bulk collectors
                    </Text>
                  </View>
                  <TouchableOpacity onPress={loadHandovers} style={styles.handoversRefreshBtn}>
                    <Text style={styles.handoversRefreshBtnText}>
                      {isLoadingHandovers ? "..." : "🔄 Refresh"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isLoadingHandovers && handovers.length === 0 ? (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : handovers.length === 0 ? (
                  <View style={styles.emptyHandoversBox}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>🚛</Text>
                    <Text style={styles.emptyHandoversTitle}>No Municipal Pickups Recorded Yet</Text>
                    <Text style={styles.emptyHandoversDesc}>
                      When the BMC collection vehicle arrives, present your Society QR code above. Inspected segregated handovers will appear here with points credited.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.handoversList}>
                    {handovers.map((item) => {
                      const isSeg = item.outcome === "SEGREGATED";
                      const isMixed = item.outcome === "MIXED";
                      return (
                        <View key={item._id} style={styles.handoverItemCard}>
                          <View style={styles.handoverTopRow}>
                            <View style={styles.handoverLeft}>
                              <View
                                style={[
                                  styles.handoverOutcomeBadge,
                                  isSeg && styles.badgeSegregated,
                                  isMixed && styles.badgeMixed,
                                  !isSeg && !isMixed && styles.badgeNoHandover,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.handoverOutcomeText,
                                    isSeg && styles.textSegregated,
                                    isMixed && styles.textMixed,
                                    !isSeg && !isMixed && styles.textNoHandover,
                                  ]}
                                >
                                  {item.outcome}
                                </Text>
                              </View>
                              <Text style={styles.handoverDate}>
                                {new Date(item.timestamp).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Text>
                            </View>

                            <View style={styles.handoverPointsBadge}>
                              <Text
                                style={[
                                  styles.handoverPointsText,
                                  item.pointsAwarded > 0 ? styles.pointsPositive : styles.pointsZero,
                                ]}
                              >
                                {item.pointsAwarded > 0 ? `+${item.pointsAwarded} pts` : "0 pts"}
                              </Text>
                            </View>
                          </View>

                          {item.outcome !== "NO_HANDOVER" && (
                            <View style={styles.handoverDetailRow}>
                              <Text style={styles.handoverDetailText}>
                                Stream: <Text style={{ fontWeight: "700" }}>{item.wasteType?.toUpperCase()}</Text> • {item.weight} kg ({item.weightBasis})
                              </Text>
                            </View>
                          )}

                          <View style={styles.handoverReasonBox}>
                            <Text style={styles.handoverReasonText}>
                              {item.pointsReason || (item.pointsAwarded > 0 ? "Daily segregation reward" : "No points awarded")}
                            </Text>
                          </View>

                          {item.notes ? (
                            <Text style={styles.handoverNotesText}>
                              Note: {item.notes}
                            </Text>
                          ) : null}

                          {item.bmcCollectorId?.name && (
                            <Text style={styles.handoverCollectorText}>
                              Collector: {item.bmcCollectorId.name} ({item.bmcCollectorId.collectorId || item.bmcCollectorId.phone})
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* -------------------------------------------------------- */}
              {/* TASK 2: SOCIETY JOIN CODE FOR RESIDENTS                  */}
              {/* -------------------------------------------------------- */}
              <View style={[styles.card, styles.joinCodeCard]}>
                <View style={styles.joinCodeHeader}>
                  <Text style={styles.joinCodeIcon}>🔑</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.joinCodeTitle}>Society Join Code</Text>
                    <Text style={styles.joinCodeSubtitle}>
                      Share this unique code with building residents to join your society
                    </Text>
                  </View>
                </View>
                <View style={styles.joinCodeBox}>
                  <Text style={styles.joinCodeText}>{society.joinCode || "Generating..."}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyJoinCodeBtn}
                  onPress={() => {
                    Alert.alert(
                      "Society Join Code",
                      `Join Code: ${society.joinCode}\n\nShare this code with your residents. Residents enter this code in their GreenPoint mobile app along with their flat number to request household membership.`
                    );
                  }}
                >
                  <Text style={styles.copyJoinCodeBtnText}>📋 Share / Copy Join Code</Text>
                </TouchableOpacity>
              </View>

              {/* -------------------------------------------------------- */}
              {/* TASK 2: INTERNAL COLLECTOR ASSIGNMENT                    */}
              {/* -------------------------------------------------------- */}
              <View style={styles.card}>
                <Text style={styles.sectionHeaderTitle}>Internal Society Collector</Text>
                <Text style={styles.sectionHeaderSubtitle}>
                  Assign an existing registered collector to verify daily household waste segregation.
                </Text>

                {society.internalCollectorId ? (
                  <View style={styles.collectorAssignedBox}>
                    <View style={styles.collectorBadgeRow}>
                      <Text style={styles.collectorAssignedBadge}>● ASSIGNED & ACTIVE</Text>
                    </View>
                    <Text style={styles.collectorNameText}>
                      👤 {society.internalCollectorId.name || "Assigned Collector"}
                    </Text>
                    <Text style={styles.collectorDetailText}>
                      Phone: {society.internalCollectorId.phone || "N/A"}
                    </Text>
                    <Text style={styles.collectorDetailText}>
                      Staff ID: {society.internalCollectorId.collectorId || "COL-STAFF"}
                    </Text>
                    <Text style={styles.collectorNoteText}>
                      This collector has exclusive access to verify waste segregation for approved member households in {society.name}.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.collectorAssignForm}>
                    <Text style={styles.assignInstructionText}>
                      Enter the registered phone number of the collector:
                    </Text>
                    <View style={styles.collectorInputRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="10-digit phone (e.g. 9876543211)"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={collectorPhone}
                        onChangeText={(t) => {
                          setCollectorPhone(t);
                          setCollectorError(null);
                          setCollectorLookupResult(null);
                        }}
                      />
                      <TouchableOpacity
                        style={[styles.lookupBtn, isLookingUpCollector && { opacity: 0.7 }]}
                        onPress={handleLookupCollector}
                        disabled={isLookingUpCollector}
                      >
                        {isLookingUpCollector ? (
                          <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                          <Text style={styles.lookupBtnText}>Lookup</Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    {collectorError ? (
                      <Text style={styles.collectorErrorText}>⚠️ {collectorError}</Text>
                    ) : null}

                    {collectorLookupResult && (
                      <View style={styles.collectorFoundBox}>
                        <Text style={styles.collectorFoundTitle}>Collector Found</Text>
                        <Text style={styles.collectorFoundName}>
                          {collectorLookupResult.collector.name} ({collectorLookupResult.collector.phone})
                        </Text>
                        <Text style={styles.collectorFoundId}>
                          Staff ID: {collectorLookupResult.collector.collectorId || "COL-STAFF"}
                        </Text>
                        {collectorLookupResult.alreadyAssigned ? (
                          <Text style={styles.alreadyAssignedText}>
                            Already assigned to this society.
                          </Text>
                        ) : (
                          <TouchableOpacity
                            style={[styles.confirmAssignBtn, isAssigningCollector && { opacity: 0.7 }]}
                            onPress={handleAssignCollector}
                            disabled={isAssigningCollector}
                          >
                            {isAssigningCollector ? (
                              <ActivityIndicator color={COLORS.white} size="small" />
                            ) : (
                              <Text style={styles.confirmAssignBtnText}>
                                Confirm Assignment: {collectorLookupResult.collector.name}
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* -------------------------------------------------------- */}
              {/* TASK 2: RESIDENT MEMBERSHIP & HOUSEHOLDS                 */}
              {/* -------------------------------------------------------- */}
              <View style={styles.card}>
                <View style={styles.membershipHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>Society Households</Text>
                  <TouchableOpacity onPress={loadMembers} style={styles.refreshIconBtn}>
                    <Text style={{ fontSize: 16 }}>🔄</Text>
                  </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabRow}>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === "pending" && styles.tabBtnActive]}
                    onPress={() => setActiveTab("pending")}
                  >
                    <Text style={[styles.tabBtnText, activeTab === "pending" && styles.tabBtnTextActive]}>
                      Pending Requests ({membersData?.counts?.pending || 0})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabBtn, activeTab === "approved" && styles.tabBtnActive]}
                    onPress={() => setActiveTab("approved")}
                  >
                    <Text style={[styles.tabBtnText, activeTab === "approved" && styles.tabBtnTextActive]}>
                      Approved Flats ({membersData?.counts?.approved || 0})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Tab content */}
                {isLoadingMembers ? (
                  <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                ) : activeTab === "pending" ? (
                  <View style={{ marginTop: 12 }}>
                    {membersData?.pending?.length === 0 ? (
                      <Text style={styles.emptyListText}>No pending household requests.</Text>
                    ) : (
                      membersData.pending.map((reqItem) => (
                        <View key={reqItem._id} style={styles.requestCard}>
                          <View style={styles.requestInfoRow}>
                            <Text style={styles.requestCitizenName}>
                              {reqItem.citizenId?.name || "Resident"}
                            </Text>
                            <Text style={styles.requestCitizenPhone}>
                              {reqItem.citizenId?.phone}
                            </Text>
                          </View>
                          <Text style={styles.requestAddress}>🏠 {reqItem.address}</Text>
                          <Text style={styles.requestDate}>
                            Submitted: {new Date(reqItem.submittedAt).toLocaleDateString()}
                          </Text>

                          <View style={styles.requestActionRow}>
                            <TouchableOpacity
                              style={styles.rejectBtn}
                              onPress={() => handleOpenReject(reqItem)}
                              disabled={isReviewing}
                            >
                              <Text style={styles.rejectBtnText}>✕ Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.approveBtn}
                              onPress={() => handleApproveRequest(reqItem._id)}
                              disabled={isReviewing}
                            >
                              <Text style={styles.approveBtnText}>✓ Approve</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                ) : (
                  <View style={{ marginTop: 12 }}>
                    {membersData?.approved?.length === 0 ? (
                      <Text style={styles.emptyListText}>No approved household members yet.</Text>
                    ) : (
                      membersData.approved.map((appItem) => (
                        <View key={appItem._id} style={styles.approvedMemberCard}>
                          <View style={styles.requestInfoRow}>
                            <Text style={styles.requestCitizenName}>
                              {appItem.citizenId?.name || "Resident"}
                            </Text>
                            <Text style={styles.householdQrBadge}>
                              {appItem.householdId?.qrCode || "GP-HH-ACTIVE"}
                            </Text>
                          </View>
                          <Text style={styles.requestAddress}>🏠 {appItem.address}</Text>
                          <Text style={styles.approvedMetaText}>
                            Verified member • {appItem.householdId?.totalScans || 0} collections logged
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            </>
          )}
          </View>
        )}
      </ScrollView>

      {/* Rejection Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeaderTitle}>Reject Membership Request</Text>
            <Text style={styles.modalSubtitle}>
              Citizen: {selectedRequest?.citizenId?.name} ({selectedRequest?.address})
            </Text>
            <Text style={styles.label}>Reason for Rejection *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { marginBottom: 16 }]}
              placeholder="e.g. Flat number does not match society resident records"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={rejectionNote}
              onChangeText={setRejectionNote}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
                disabled={isReviewing}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRejectConfirmBtn}
                onPress={handleConfirmReject}
                disabled={isReviewing}
              >
                {isReviewing ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalRejectConfirmBtnText}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Task 2: Join Code Styles
  joinCodeCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
  },
  joinCodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  joinCodeIcon: {
    fontSize: 28,
  },
  joinCodeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#166534",
  },
  joinCodeSubtitle: {
    fontSize: 12,
    color: "#15803d",
    marginTop: 2,
  },
  joinCodeBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#86EFAC",
    marginBottom: 12,
  },
  joinCodeText: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 3,
    color: "#15803d",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  copyJoinCodeBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  copyJoinCodeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Task 2: Collector Styles
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 14,
  },
  collectorAssignedBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  collectorBadgeRow: {
    marginBottom: 8,
  },
  collectorAssignedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    color: "#15803d",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  collectorNameText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  collectorDetailText: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  collectorNoteText: {
    fontSize: 12,
    color: "#15803d",
    fontStyle: "italic",
    marginTop: 10,
    lineHeight: 16,
  },
  collectorAssignForm: {
    marginTop: 4,
  },
  assignInstructionText: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 8,
  },
  collectorInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  lookupBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  lookupBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  collectorErrorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
  collectorFoundBox: {
    marginTop: 14,
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  collectorFoundTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    textTransform: "uppercase",
  },
  collectorFoundName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 4,
  },
  collectorFoundId: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },
  alreadyAssignedText: {
    fontSize: 12,
    color: "#15803d",
    fontWeight: "600",
    marginTop: 6,
  },
  confirmAssignBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  confirmAssignBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Task 2: Membership Styles
  membershipHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 3,
    marginTop: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    ...SHADOW.small,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabBtnTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  emptyListText: {
    textAlign: "center",
    fontSize: 13,
    color: "#9CA3AF",
    marginVertical: 16,
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  requestInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestCitizenName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
  },
  requestCitizenPhone: {
    fontSize: 12,
    color: "#6B7280",
  },
  requestAddress: {
    fontSize: 13,
    color: "#374151",
    marginTop: 4,
  },
  requestDate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  requestActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
  },
  rejectBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  approveBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#16a34a",
    alignItems: "center",
  },
  approveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  approvedMemberCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  householdQrBadge: {
    backgroundColor: "#DCFCE7",
    color: "#15803d",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  approvedMetaText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    ...SHADOW.modal,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#DC2626",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },
  modalRejectConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  modalRejectConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Society Wallet Card
  societyWalletCard: {
    backgroundColor: "#064e3b",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  walletHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#a7f3d0",
    letterSpacing: 1,
  },
  walletPoints: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 2,
  },
  walletPointsUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6ee7b7",
  },
  walletIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  walletSubtitle: {
    fontSize: 11,
    color: "#d1fae5",
    marginTop: 8,
    lineHeight: 16,
  },

  // Handovers List Styles
  handoversCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  handoversHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  handoversTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  handoversSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  handoversRefreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
  },
  handoversRefreshBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0d47a1",
  },
  emptyHandoversBox: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  emptyHandoversTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#334155",
    textAlign: "center",
  },
  emptyHandoversDesc: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  handoversList: {
    gap: 12,
  },
  handoverItemCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  handoverTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  handoverLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  handoverOutcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSegregated: {
    backgroundColor: "#dcfce7",
  },
  badgeMixed: {
    backgroundColor: "#fef3c7",
  },
  badgeNoHandover: {
    backgroundColor: "#fee2e2",
  },
  handoverOutcomeText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  textSegregated: {
    color: "#15803d",
  },
  textMixed: {
    color: "#b45309",
  },
  textNoHandover: {
    color: "#b91c1c",
  },
  handoverDate: {
    fontSize: 12,
    color: "#64748b",
  },
  handoverPointsBadge: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  handoverPointsText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  pointsPositive: {
    color: "#15803d",
  },
  pointsZero: {
    color: "#64748b",
  },
  handoverDetailRow: {
    marginBottom: 6,
  },
  handoverDetailText: {
    fontSize: 12,
    color: "#334155",
  },
  handoverReasonBox: {
    backgroundColor: "#ffffff",
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 6,
  },
  handoverReasonText: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#475569",
  },
  handoverNotesText: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  handoverCollectorText: {
    fontSize: 10,
    color: "#94a3b8",
  },
});

