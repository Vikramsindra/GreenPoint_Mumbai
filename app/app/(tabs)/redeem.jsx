// filepath: app/app/(tabs)/redeem.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Clipboard, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePointsStore } from '../../store/pointsStore';
import { useUiStore } from '../../store/uiStore';
import RewardCard from '../../components/RewardCard';
import * as api from '../../services/api';
import { COLORS, SPACING, SHADOW } from '../../constants/theme';

export default function RedeemScreen() {
  const { balance, refresh, isLoading } = usePointsStore();
  const { openMenu } = useUiStore();
  const [rewards, setRewards] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState({ visible: false, reward: null });
  const [successModal, setSuccessModal] = useState({ visible: false, voucherCode: '' });

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const res = await api.getRedeemOptions();
      setRewards(res.data);
    } catch (e) {
      console.error('Failed to load rewards', e);
    }
    setLoadingOptions(false);
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const handleRedeemClick = (reward) => {
    setConfirmModal({ visible: true, reward });
  };

  const handleConfirmRedeem = async () => {
    try {
      const res = await api.redeemReward(confirmModal.reward.id, confirmModal.reward.pointsCost);
      setConfirmModal({ visible: false, reward: null });
      setSuccessModal({ visible: true, voucherCode: res.data.voucherCode });
      refresh();
    } catch (e) {
      alert(e.response?.data?.message || 'Redemption failed');
      setConfirmModal({ visible: false, reward: null });
    }
  };

  const copyCode = (code) => {
    Clipboard.setString(code);
    alert('Copied to clipboard!');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.appBarIcon} onPress={openMenu}>
          <Ionicons name="menu-outline" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Ionicons name="leaf" size={20} color={COLORS.primary} style={{marginRight: 6}} />
          <Text style={styles.logoText}>Green<Text style={{color: COLORS.primary}}>Point</Text></Text>
        </View>
        <TouchableOpacity style={styles.appBarIcon}>
           <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isLoading || loadingOptions} onRefresh={() => {refresh(); loadOptions();}} />}
      >
        
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceAmount}>{balance}</Text>
          <Text style={styles.balanceLabel}>GreenPoints</Text>
          <View style={styles.divider} />
          <Text style={styles.tipText}>50 pts = ₹10 BEST Credit</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Redeem Points</Text>
          <View style={styles.rewardsList}>
            {rewards.map(r => (
              <RewardCard 
                key={r.id} 
                reward={r} 
                userBalance={balance} 
                onRedeem={() => handleRedeemClick(r)} 
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Confirm Modal */}
      {confirmModal.visible && confirmModal.reward && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalHeading}>Confirm Redemption</Text>
              <Text style={styles.modalText}>
                Redeem {confirmModal.reward.name} for {confirmModal.reward.pointsCost} pts?
              </Text>
              <Text style={styles.modalSubText}>
                Your new balance after: {balance - confirmModal.reward.pointsCost} pts
              </Text>
              
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmModal({ visible: false, reward: null })}>
                  <Text style={styles.cancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmRedeem}>
                  <Text style={styles.confirmBtnTxt}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Success Modal */}
      {successModal.visible && (
        <Modal transparent animationType="slide">
          <View style={styles.successScreen}>
            <Text style={{ fontSize: 64 }}>✅</Text>
            <Text style={styles.successHeading}>Redemption Successful!</Text>
            
            <TouchableOpacity style={styles.codeBox} onPress={() => copyCode(successModal.voucherCode)}>
              <Text style={styles.codeText}>{successModal.voucherCode}</Text>
            </TouchableOpacity>
            <Text style={styles.tapToCopy}>Tap to Copy</Text>
            
            <Text style={styles.successInstructions}>Use this code at the respective vendor or service portal to claim your reward.</Text>
            
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSuccessModal({ visible: false, voucherCode: '' })}>
              <Text style={styles.closeBtnTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  appBarIcon: { padding: 4 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  balanceHeader: { backgroundColor: COLORS.primary, margin: SPACING.lg, borderRadius: 16, padding: 20, alignItems: 'center', ...SHADOW.card },
  balanceLabel: { color: COLORS.white, fontSize: 13, fontWeight: '500' },
  balanceAmount: { color: COLORS.white, fontSize: 36, fontWeight: 'bold', marginVertical: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', width: '100%', marginVertical: 12 },
  tipText: { color: COLORS.white, fontSize: 12 },
  section: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  sectionHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: SPACING.md },
  rewardsList: { gap: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, ...SHADOW.modal },
  modalHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  modalText: { fontSize: 16, color: COLORS.text, marginBottom: 8 },
  modalSubText: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, alignItems: 'center' },
  cancelBtnTxt: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 12, backgroundColor: COLORS.primary, borderRadius: 8, alignItems: 'center' },
  confirmBtnTxt: { color: COLORS.white, fontWeight: '600' },
  
  successScreen: { flex: 1, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', padding: 30 },
  successHeading: { color: COLORS.white, fontSize: 24, fontWeight: 'bold', marginTop: 16, marginBottom: 32 },
  codeBox: { backgroundColor: COLORS.white, padding: 16, borderRadius: 8, marginBottom: 8 },
  codeText: { fontSize: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: 'bold', color: COLORS.text, letterSpacing: 2 },
  tapToCopy: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 32 },
  successInstructions: { color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  closeBtn: { backgroundColor: COLORS.white, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 20 },
  closeBtnTxt: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 }
});
