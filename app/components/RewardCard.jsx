// filepath: app/components/RewardCard.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOW } from '../constants/theme';

export default function RewardCard({ reward, userBalance, onRedeem }) {
  const canAfford = userBalance >= reward.pointsCost;
  
  const getIconBg = (cat) => {
    switch (cat) {
      case 'transport': return '#dbeafe';
      case 'utility': return '#fef3c7';
      case 'shopping': return '#fce7f3';
      case 'civic': return '#e0e7ff';
      default: return '#f3f4f6';
    }
  };

  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: getIconBg(reward.category) }]}>
        <Text style={styles.emoji}>{reward.emoji}</Text>
      </View>
      
      <View style={styles.middleCol}>
        <Text style={styles.name} numberOfLines={1}>{reward.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>{reward.description}</Text>
      </View>
      
      <View style={styles.rightCol}>
        <Text style={[styles.cost, !canAfford && { color: COLORS.textSecondary }]}>
          {reward.pointsCost} <Text style={{fontSize: 12}}>pts</Text>
        </Text>
        
        <TouchableOpacity 
          style={[styles.btn, !canAfford && styles.btnDisabled]} 
          onPress={onRedeem}
          disabled={!canAfford}
        >
          <Text style={[styles.btnTxt, !canAfford && styles.btnTxtDisabled]}>Redeem</Text>
        </TouchableOpacity>
        
        {!canAfford && (
          <Text style={styles.needTxt}>Need {reward.pointsCost - userBalance} more pts</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', ...SHADOW.card },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 24 },
  middleCol: { flex: 1, paddingHorizontal: 12 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  desc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  rightCol: { alignItems: 'center', minWidth: 70 },
  cost: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  btn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, width: '100%', alignItems: 'center' },
  btnDisabled: { backgroundColor: COLORS.border },
  btnTxt: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  btnTxtDisabled: { color: COLORS.textMuted },
  needTxt: { fontSize: 9, color: COLORS.danger, marginTop: 4, textAlign: 'center' }
});
