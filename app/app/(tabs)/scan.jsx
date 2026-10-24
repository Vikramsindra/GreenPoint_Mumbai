import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { usePointsStore } from '../../store/pointsStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import ScanSuccessOverlay from '../../components/ScanSuccessOverlay';
import * as api from '../../services/api';
import { COLORS, SPACING, SHADOW, RADIUS } from '../../constants/theme';

export default function ScanScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { openMenu } = useUiStore();
  const isCitizen = user?.role === 'citizen' || !user?.role;
  const isRepresentative = user?.role === 'society_representative';
  const isOfficer = user?.role === 'officer';
  const isBmcCollector = user?.role === 'bmc_collector';
  const isInternalCollector = user?.role === 'collector';

  // Task 2: Citizen Household and Membership state
  const [household, setHousehold] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loadingCitizenState, setLoadingCitizenState] = useState(true);
  const [citizenRefreshing, setCitizenRefreshing] = useState(false);
  const [showJoinCodeToggle, setShowJoinCodeToggle] = useState(false);

  // Join Society Request form state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [flatAddressInput, setFlatAddressInput] = useState('');
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
  const [joinError, setJoinError] = useState(null);

  // Representative Society State (if logged in as representative)
  const [repSociety, setRepSociety] = useState(null);
  const [loadingRepSociety, setLoadingRepSociety] = useState(false);

  const fetchCitizenMembershipAndHousehold = useCallback(async () => {
    if (!isCitizen) return;
    try {
      const [hhRes, memRes] = await Promise.allSettled([
        api.getMyHousehold(),
        api.getMyMembership(),
      ]);

      if (hhRes.status === 'fulfilled' && hhRes.value?.data?.success) {
        const hhData = hhRes.value.data.data.household;
        setHousehold(hhData);
        // Pre-fill flat address if unlinked and empty
        if (hhData?.address && !flatAddressInput) {
          setFlatAddressInput(hhData.address);
        }
      } else {
        setHousehold(null);
      }

      if (memRes.status === 'fulfilled' && memRes.value?.data) {
        setMembership(memRes.value.data);
      } else {
        setMembership(null);
      }
    } catch (e) {
      console.log('Error fetching citizen household / membership:', e.message);
    } finally {
      setLoadingCitizenState(false);
      setCitizenRefreshing(false);
    }
  }, [isCitizen, flatAddressInput]);

  const fetchRepresentativeSociety = useCallback(async () => {
    if (!isRepresentative) return;
    setLoadingRepSociety(true);
    try {
      const res = await api.getMySociety();
      if (res.success && res.data) {
        setRepSociety(res.data);
      }
    } catch (e) {
      console.log('Error fetching representative society:', e.message);
    } finally {
      setLoadingRepSociety(false);
    }
  }, [isRepresentative]);

  useEffect(() => {
    if (isCitizen) {
      fetchCitizenMembershipAndHousehold();
    } else if (isRepresentative) {
      fetchRepresentativeSociety();
    }
  }, [user?._id, user?.role, isCitizen, isRepresentative, fetchCitizenMembershipAndHousehold, fetchRepresentativeSociety]);

  const handleJoinSubmit = async () => {
    if (!joinCodeInput.trim()) {
      setJoinError('Please enter a society join code (e.g. SOC-YGY62G)');
      return;
    }
    if (!flatAddressInput.trim() || flatAddressInput.trim().length < 2) {
      setJoinError('Please enter your flat number and address details');
      return;
    }
    setJoinError(null);
    setIsSubmittingJoin(true);
    try {
      const res = await api.submitSocietyJoinRequest({
        joinCode: joinCodeInput.trim().toUpperCase(),
        address: flatAddressInput.trim(),
      });
      if (res.success) {
        Alert.alert(
          'Request Submitted',
          'Your membership request has been submitted to the society representative for approval.'
        );
        setJoinCodeInput('');
        setShowJoinCodeToggle(false);
        fetchCitizenMembershipAndHousehold();
      }
    } catch (e) {
      setJoinError(e.response?.data?.message || e.message || 'Failed to submit join request');
    } finally {
      setIsSubmittingJoin(false);
    }
  };

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [selectedAction, setSelectedAction] = useState('SEGREGATION');
  const [overlayState, setOverlayState] = useState(false);
  const [overlayData, setOverlayData] = useState(null);
  const refreshPoints = usePointsStore((s) => s.refresh);

  // Collector Form State
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [scannedCitizenId, setScannedCitizenId] = useState('');
  const [isProperlySegregated, setIsProperlySegregated] = useState(true);
  const [wasteAmount, setWasteAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actions = [
    { id: 'SEGREGATION', label: 'Segregation +10pts' },
    { id: 'COMPOSTING', label: 'Composting +20pts' },
    { id: 'RECYCLABLE_DROP', label: 'Recyclable +5pts' },
  ];

  const handleScan = async (data) => {
    if (scanned || overlayState || formModalVisible) return;
    setScanned(true);
    setScannedCitizenId(data);
    setIsProperlySegregated(true);
    setWasteAmount('');
    setNotes('');
    setFormModalVisible(true);
  };

  const submitCollectionForm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.scanQR(scannedCitizenId, selectedAction, {
        isSegregated: isProperlySegregated,
        amount: wasteAmount,
        notes: notes,
      });
      setFormModalVisible(false);
      setOverlayData({
        type: 'success',
        points: res.data.pointsEarned,
        newBalance: res.data.newBalance,
        message: res.message,
      });
      setOverlayState(true);
      refreshPoints();
    } catch (e) {
      if (e.response?.status === 409) {
        setFormModalVisible(false);
        setOverlayData({ type: 'duplicate' });
        setOverlayState(true);
      } else {
        alert('Collection failed: ' + (e.response?.data?.message || e.message));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelScan = () => {
    setFormModalVisible(false);
    setTimeout(() => setScanned(false), 1000);
  };

  const onOverlayDismiss = () => {
    setOverlayState(false);
    setTimeout(() => setScanned(false), 1000);
  };

  const downloadQR = async (url) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Storage permission is required to save the QR code.');
        return;
      }
      const filename = `GreenPoint_QR_${user?._id?.substring(0, 8) || 'User'}.png`;
      const fileUri = FileSystem.documentDirectory + filename;
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
      alert('QR Code saved successfully to your gallery!');
    } catch (error) {
      alert('Failed to save QR Code: ' + error.message);
    }
  };

  // -------------------------------------------------------------
  // 1. SOCIETY REPRESENTATIVE VIEW (If Representative opens Scan tab)
  // -------------------------------------------------------------
  if (isRepresentative) {
    const isApproved = repSociety?.registrationStatus === 'APPROVED';
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <LinearGradient colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]} style={styles.gradientHeader}>
          <SafeAreaView edges={['top']}>
            <View style={styles.appBar}>
              <TouchableOpacity style={styles.appBarIcon} onPress={openMenu}>
                <Ionicons name="menu-outline" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Ionicons name="business" size={20} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={[styles.logoText, { color: COLORS.white }]}>GreenPoint</Text>
              </View>
              <TouchableOpacity style={styles.appBarIcon} onPress={fetchRepresentativeSociety}>
                <Ionicons name="refresh-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.citizenHeader}>
              <Text style={styles.citizenTitle}>Society Join Code</Text>
              <Text style={styles.citizenSubtitle}>
                Provide this unique code to your residents to join your society
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView style={styles.citizenContent} contentContainerStyle={{ paddingBottom: 40 }}>
          {loadingRepSociety ? (
            <View style={[styles.qrCard, { paddingVertical: 40 }]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 13 }}>
                Loading society information...
              </Text>
            </View>
          ) : (
            <View style={styles.qrCard}>
              <View style={styles.societyBadgeRow}>
                <Text style={styles.societyBadgeText}>
                  🏢 {repSociety?.name || 'Housing Society'}
                </Text>
              </View>

              {isApproved ? (
                <>
                  <View style={styles.repJoinCodeContainer}>
                    <Text style={styles.repJoinCodeLabel}>RESIDENT JOIN CODE</Text>
                    <View style={styles.repJoinCodePill}>
                      <Text style={styles.repJoinCodeText}>{repSociety?.joinCode || 'Generating...'}</Text>
                    </View>
                    <Text style={styles.repJoinCodeHelp}>
                      Building residents enter this code on their Scan tab to request household membership.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.repActionBtn}
                    onPress={() => router.push('/(society-representative)/society')}
                  >
                    <Ionicons name="people-outline" size={18} color={COLORS.white} />
                    <Text style={styles.repActionBtnText}>Review Member Requests</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>⏳</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' }}>
                    Society Review Pending
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                    Your society application is awaiting Ward Officer verification. Once approved, your Join Code will be issued here.
                  </Text>
                  <TouchableOpacity
                    style={[styles.repActionBtn, { marginTop: 16 }]}
                    onPress={() => router.push('/(society-representative)/society')}
                  >
                    <Text style={styles.repActionBtnText}>View Application Status</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // -------------------------------------------------------------
  // 2. WARD OFFICER / BMC COLLECTOR INFORMATIVE VIEW
  // -------------------------------------------------------------
  if (isOfficer || isBmcCollector) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <LinearGradient colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]} style={styles.gradientHeader}>
          <SafeAreaView edges={['top']}>
            <View style={styles.appBar}>
              <TouchableOpacity style={styles.appBarIcon} onPress={openMenu}>
                <Ionicons name="menu-outline" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={[styles.logoText, { color: COLORS.white }]}>GreenPoint</Text>
              </View>
              <View style={{ width: 28 }} />
            </View>
            <View style={styles.citizenHeader}>
              <Text style={styles.citizenTitle}>{isOfficer ? 'Ward Officer' : 'BMC Collector'}</Text>
              <Text style={styles.citizenSubtitle}>Municipal Operational Boundaries</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={[styles.citizenContent, { paddingTop: 20 }]}>
          <View style={styles.qrCard}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{isOfficer ? '🏛️' : '🚛'}</Text>
            <Text style={styles.cardSectionTitle}>
              {isOfficer ? 'Officer Oversight Portal' : 'Municipal Waste Transport'}
            </Text>
            <Text style={[styles.joinDescription, { marginTop: 8 }]}>
              {isOfficer
                ? 'Housing society approvals, municipal reviews, and collection point oversight are performed via the GreenPoint Web Dashboard. Individual household collections are handled by internal society collectors.'
                : 'BMC collectors manage society-level municipal waste handovers at designated collection points. Individual household memberships and collections are managed by internal society collectors.'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------
  // 3. CITIZEN VIEW: Household QR Code & Society Membership States
  // -------------------------------------------------------------
  if (isCitizen) {
    const hasApprovedSociety = !!(
      (membership && membership.status === 'APPROVED') ||
      (household && household.societyRef)
    );
    const hasUnlinkedHousehold = !!(household && !household.societyRef && (!membership || membership.status !== 'APPROVED'));
    const isApprovedHousehold = hasApprovedSociety && !!household?.qrCode;
    const isPendingMembership = !isApprovedHousehold && membership?.status === 'PENDING';
    const isRejectedMembership = !isApprovedHousehold && membership?.status === 'REJECTED';
    const isNoMembership = !isApprovedHousehold && !isPendingMembership && !isRejectedMembership;

    const societyName = household?.societyRef?.name || membership?.societyId?.name || null;

    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <LinearGradient colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]} style={styles.gradientHeader}>
          <SafeAreaView edges={['top']}>
            <View style={styles.appBar}>
              <TouchableOpacity style={styles.appBarIcon} onPress={openMenu}>
                <Ionicons name="menu-outline" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Ionicons name="leaf" size={20} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={[styles.logoText, { color: COLORS.white }]}>GreenPoint</Text>
              </View>
              <TouchableOpacity style={styles.appBarIcon} onPress={fetchCitizenMembershipAndHousehold}>
                <Ionicons name="refresh-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.citizenHeader}>
              <Text style={styles.citizenTitle}>Household QR</Text>
              <Text style={styles.citizenSubtitle}>
                {isApprovedHousehold
                  ? 'Present to your society collector at daily waste pickup'
                  : 'Manage your housing society membership identity'}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView
          style={styles.citizenContent}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={citizenRefreshing}
              onRefresh={() => {
                setCitizenRefreshing(true);
                fetchCitizenMembershipAndHousehold();
              }}
            />
          }
        >
          {loadingCitizenState ? (
            <View style={[styles.qrCard, { paddingVertical: 40 }]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 13 }}>
                Loading household identity...
              </Text>
            </View>
          ) : isApprovedHousehold ? (
            /* STATE 1: APPROVED HOUSEHOLD - DISPLAY ACTUAL HOUSEHOLD QR */
            <>
              <View style={styles.qrCard}>
                <View style={styles.societyBadgeRow}>
                  <Text style={styles.societyBadgeText}>
                    🏢 {societyName || 'Registered Society'}
                  </Text>
                </View>

                <View style={styles.qrImageWrapper}>
                  {household.qrImageUrl ? (
                    <Image
                      source={{ uri: household.qrImageUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={{ width: 220, height: 220, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="qr-code-outline" size={120} color={COLORS.primary} />
                    </View>
                  )}
                </View>

                <View style={styles.qrUserDetails}>
                  <Text style={styles.qrHelperText}>{user?.name}</Text>
                  <Text style={styles.qrHouseholdAddress}>🏠 {household.address}</Text>
                  <View style={styles.qrHouseholdIdBadge}>
                    <Text style={styles.qrHouseholdIdLabel}>Household ID:</Text>
                    <Text style={styles.qrHouseholdIdCode}>{household.qrCode}</Text>
                  </View>
                </View>

                {household.qrImageUrl ? (
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => downloadQR(household.qrImageUrl)}
                  >
                    <Ionicons name="download-outline" size={18} color={COLORS.primaryDark} />
                    <Text style={styles.downloadBtnText}>Save Household QR</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.toggleJoinFormBtn}
                  onPress={() => setShowJoinCodeToggle(!showJoinCodeToggle)}
                >
                  <Text style={styles.toggleJoinFormBtnText}>
                    {showJoinCodeToggle ? '▲ Hide Join Code Form' : '▼ Enter Society Join Code'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Optional Join Code Form if approved user wants to re-link */}
              {showJoinCodeToggle && (
                <View style={[styles.qrCard, { marginTop: 12 }]}>
                  <Text style={styles.cardSectionTitle}>Join With Another Society Code</Text>
                  {joinError && (
                    <View style={styles.joinErrorBox}>
                      <Text style={styles.joinErrorText}>⚠️ {joinError}</Text>
                    </View>
                  )}
                  <View style={styles.citizenFormField}>
                    <Text style={styles.citizenFormLabel}>Society Join Code *</Text>
                    <TextInput
                      style={styles.citizenFormInput}
                      placeholder="e.g. SOC-YGY62G"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      value={joinCodeInput}
                      onChangeText={(t) => {
                        setJoinCodeInput(t.toUpperCase());
                        setJoinError(null);
                      }}
                    />
                  </View>
                  <View style={styles.citizenFormField}>
                    <Text style={styles.citizenFormLabel}>Flat / Household Address *</Text>
                    <TextInput
                      style={[styles.citizenFormInput, styles.citizenTextArea]}
                      placeholder="e.g. Flat 402, Wing B"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={2}
                      value={flatAddressInput}
                      onChangeText={(t) => {
                        setFlatAddressInput(t);
                        setJoinError(null);
                      }}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.submitJoinBtn, isSubmittingJoin && { opacity: 0.7 }]}
                    onPress={handleJoinSubmit}
                    disabled={isSubmittingJoin}
                  >
                    {isSubmittingJoin ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.submitJoinBtnText}>Submit Join Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : isPendingMembership ? (
            /* STATE 2: MEMBERSHIP PENDING APPROVAL */
            <View style={[styles.qrCard, styles.pendingBorderCard]}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>● PENDING APPROVAL</Text>
              </View>
              <Text style={styles.cardSectionTitle}>Membership Request Submitted</Text>
              <Text style={styles.pendingSocietyName}>
                Society: {membership?.societyId?.name || 'Housing Society'}
              </Text>
              <Text style={styles.pendingAddressText}>
                Flat Address: {membership?.address}
              </Text>
              <Text style={styles.pendingDateText}>
                Submitted on: {new Date(membership?.submittedAt || Date.now()).toLocaleDateString()}
              </Text>
              <View style={styles.pendingNoticeBox}>
                <Text style={styles.pendingNoticeText}>
                  ⏳ Your society representative has received your request. Once approved, your Household QR code will appear here automatically.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.refreshStatusBtn}
                onPress={fetchCitizenMembershipAndHousehold}
              >
                <Text style={styles.refreshStatusBtnText}>🔄 Check Approval Status</Text>
              </TouchableOpacity>
            </View>
          ) : isRejectedMembership ? (
            /* STATE 3: MEMBERSHIP REJECTED - ALLOW CORRECTION & RESUBMISSION */
            <View style={[styles.qrCard, styles.rejectedBorderCard]}>
              <View style={styles.rejectedBadge}>
                <Text style={styles.rejectedBadgeText}>● REQUEST NOT APPROVED</Text>
              </View>
              <Text style={styles.cardSectionTitle}>Membership Request Rejected</Text>
              <Text style={styles.rejectedSocietyName}>
                Society: {membership?.societyId?.name || 'Housing Society'}
              </Text>
              <View style={styles.rejectedReasonBox}>
                <Text style={styles.rejectedReasonLabel}>Representative Note:</Text>
                <Text style={styles.rejectedReasonText}>
                  {membership?.reviewNote || 'Please verify your flat details with your building representative.'}
                </Text>
              </View>

              <Text style={[styles.cardSectionTitle, { marginTop: 14, fontSize: 16 }]}>
                Correct & Resubmit Request
              </Text>
              {joinError && (
                <View style={styles.joinErrorBox}>
                  <Text style={styles.joinErrorText}>⚠️ {joinError}</Text>
                </View>
              )}
              <TextInput
                style={styles.citizenFormInput}
                placeholder="Society Join Code (e.g. SOC-YGY62G)"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                value={joinCodeInput}
                onChangeText={(t) => setJoinCodeInput(t.toUpperCase())}
              />
              <TextInput
                style={[styles.citizenFormInput, { marginTop: 8 }]}
                placeholder="Correct Flat / Unit details (e.g. Flat 402, Wing B)"
                placeholderTextColor="#9CA3AF"
                value={flatAddressInput}
                onChangeText={setFlatAddressInput}
              />
              <TouchableOpacity
                style={[styles.resubmitBtn, isSubmittingJoin && { opacity: 0.7 }]}
                onPress={handleJoinSubmit}
                disabled={isSubmittingJoin}
              >
                {isSubmittingJoin ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.resubmitBtnText}>Resubmit Membership Request</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* STATE 4: NO APPROVED MEMBERSHIP (OR UNLINKED HOUSEHOLD) - JOIN SOCIETY FORM */
            <View style={styles.qrCard}>
              <View style={styles.joinHeaderIcon}>
                <Text style={{ fontSize: 36 }}>🏢</Text>
              </View>
              <Text style={styles.cardSectionTitle}>Join a Housing Society</Text>
              <Text style={styles.joinDescription}>
                Enter the unique join code provided by your society representative to link your household and receive your daily waste collection QR.
              </Text>

              {hasUnlinkedHousehold && (
                <View style={styles.unlinkedNoticeBox}>
                  <Text style={styles.unlinkedNoticeTitle}>⚠️ Unlinked Household Record</Text>
                  <Text style={styles.unlinkedNoticeText}>
                    You have an existing registered address: <Text style={{ fontWeight: '700' }}>{household?.address}</Text>. Enter your society join code below to submit your verification request.
                  </Text>
                </View>
              )}

              {joinError && (
                <View style={styles.joinErrorBox}>
                  <Text style={styles.joinErrorText}>⚠️ {joinError}</Text>
                </View>
              )}

              <View style={styles.citizenFormField}>
                <Text style={styles.citizenFormLabel}>Society Join Code *</Text>
                <TextInput
                  style={styles.citizenFormInput}
                  placeholder="e.g. SOC-YGY62G"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  value={joinCodeInput}
                  onChangeText={(t) => {
                    setJoinCodeInput(t.toUpperCase());
                    setJoinError(null);
                  }}
                />
                <Text style={styles.inputHelpText}>
                  Ask your society representative or building management for this code.
                </Text>
              </View>

              <View style={styles.citizenFormField}>
                <Text style={styles.citizenFormLabel}>Flat / Household Address *</Text>
                <TextInput
                  style={[styles.citizenFormInput, styles.citizenTextArea]}
                  placeholder="e.g. Flat 301, Wing A, Sunrise Heights"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={2}
                  value={flatAddressInput}
                  onChangeText={(t) => {
                    setFlatAddressInput(t);
                    setJoinError(null);
                  }}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitJoinBtn, isSubmittingJoin && { opacity: 0.7 }]}
                onPress={handleJoinSubmit}
                disabled={isSubmittingJoin}
              >
                {isSubmittingJoin ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitJoinBtnText}>Request Household Membership</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.citizenInfoBox}>
            <View style={styles.iconCircle}>
              <Ionicons name="scan-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.citizenInfoText}>
              Your assigned society collector scans your Household QR each morning to verify segregation and award GreenPoints.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // -------------------------------------------------------------
  // 4. INTERNAL COLLECTOR CAMERA SCANNER VIEW
  // -------------------------------------------------------------
  if (!cameraPermission) {
    return <View style={styles.container} />;
  }
  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📷</Text>
        <Text style={{ fontSize: 16, marginBottom: 16 }}>Camera permission required</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : ({ data }) => handleScan(data)}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      <SafeAreaView style={styles.overlayWrapper} edges={['top']}>
        <View style={styles.headerBar}>
          <Text style={styles.headerText}>Scan to Award Points</Text>
        </View>

        <View style={styles.frameContainer}>
          <View style={styles.frame} />
          <Text style={styles.instructionText}>Point camera at Citizen's Household QR code</Text>
        </View>

        <View style={styles.bottomSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
            {actions.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.chip, selectedAction === a.id && styles.chipActive]}
                onPress={() => setSelectedAction(a.id)}
              >
                <Text style={[styles.chipText, selectedAction === a.id && styles.chipTextActive]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Collector Form Modal */}
      <Modal visible={formModalVisible} transparent={true} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Collection Details</Text>
              <TouchableOpacity onPress={cancelScan}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.scannedIdText}>Scanned QR: {scannedCitizenId.substring(0, 18)}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Properly Segregated?</Text>
              <Switch
                value={isProperlySegregated}
                onValueChange={setIsProperlySegregated}
                trackColor={{ false: '#d1d5db', true: COLORS.primaryLight }}
                thumbColor={isProperlySegregated ? COLORS.primary : '#9ca3af'}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Amount of Waste (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5"
                keyboardType="numeric"
                value={wasteAmount}
                onChangeText={setWasteAmount}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Any observations?"
                multiline
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={submitCollectionForm}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>{isSubmitting ? 'Submitting...' : 'Submit & Award Points'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {overlayState && (
        <ScanSuccessOverlay
          visible={overlayState}
          type={overlayData?.type}
          points={overlayData?.points}
          newBalance={overlayData?.newBalance}
          message={overlayData?.message}
          onDismiss={onOverlayDismiss}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Collector Scanner Styles
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  permissionBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8 },
  overlayWrapper: { flex: 1, justifyContent: 'space-between' },
  headerBar: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, alignItems: 'center' },
  headerText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  frameContainer: { alignItems: 'center' },
  frame: { width: 250, height: 250, borderWidth: 2, borderColor: COLORS.white, backgroundColor: 'transparent' },
  instructionText: { color: COLORS.white, marginTop: 16, fontSize: 16, fontWeight: '500', textShadowColor: '#000', textShadowRadius: 4 },
  bottomSection: { marginBottom: 80 },
  chipContainer: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  chip: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },

  // Collector Form Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: SPACING.xl,
    paddingBottom: 40,
    ...SHADOW.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scannedIdText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: SPACING.xl,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOW.floating,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Citizen QR Code Styles
  gradientHeader: {
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...SHADOW.medium,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  appBarIcon: { padding: 4 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 18, fontWeight: '800' },
  citizenHeader: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  citizenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  citizenSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  citizenContent: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    marginTop: -40,
  },
  qrCard: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOW.floating,
    elevation: 10,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(231, 240, 237, 0.5)',
  },
  qrImageWrapper: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOW.card,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrUserDetails: {
    alignItems: 'center',
    width: '100%',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  qrHelperText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.full,
    gap: 8,
    width: '100%',
  },
  downloadBtnText: {
    color: COLORS.primaryDark,
    fontWeight: 'bold',
    fontSize: 15,
  },
  toggleJoinFormBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  toggleJoinFormBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  citizenInfoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 24,
    alignItems: 'center',
    gap: 16,
    ...SHADOW.card,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  citizenInfoText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  },

  // Task 2 Citizen Styles
  societyBadgeRow: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  societyBadgeText: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 13,
  },
  qrHouseholdAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  qrHouseholdIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qrHouseholdIdLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  qrHouseholdIdCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  pendingBorderCard: {
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  pendingBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
  },
  pendingSocietyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 4,
    textAlign: 'center',
  },
  pendingAddressText: {
    fontSize: 13,
    color: '#78350F',
    marginTop: 4,
    textAlign: 'center',
  },
  pendingDateText: {
    fontSize: 11,
    color: '#A16207',
    marginTop: 6,
    textAlign: 'center',
  },
  pendingNoticeBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginVertical: 14,
  },
  pendingNoticeText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    textAlign: 'center',
  },
  refreshStatusBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
  },
  refreshStatusBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  rejectedBorderCard: {
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  rejectedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  rejectedBadgeText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
  },
  rejectedSocietyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
    marginTop: 4,
    textAlign: 'center',
  },
  rejectedReasonBox: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: 10,
    borderRadius: 6,
    width: '100%',
    marginVertical: 10,
  },
  rejectedReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  rejectedReasonText: {
    fontSize: 13,
    color: '#1F2937',
    marginTop: 2,
  },
  resubmitBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  resubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  joinHeaderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  joinDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  unlinkedNoticeBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  unlinkedNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  unlinkedNoticeText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
  citizenFormField: {
    width: '100%',
    marginBottom: 12,
  },
  citizenFormLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  citizenFormInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    width: '100%',
  },
  citizenTextArea: {
    height: 65,
    textAlignVertical: 'top',
  },
  inputHelpText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  joinErrorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    width: '100%',
  },
  joinErrorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '500',
  },
  submitJoinBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  submitJoinBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Representative Styles
  repJoinCodeContainer: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginVertical: 12,
  },
  repJoinCodeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 1,
    marginBottom: 8,
  },
  repJoinCodePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#22C55E',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 8,
  },
  repJoinCodeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  repJoinCodeHelp: {
    fontSize: 12,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 16,
  },
  repActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: RADIUS.full,
    gap: 8,
    width: '100%',
    marginTop: 8,
  },
  repActionBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
