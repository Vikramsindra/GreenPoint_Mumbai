// filepath: app/components/CampaignCard.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOW } from '../constants/theme';

export default function CampaignCard({ campaign, onQuizPress }) {
  const isExpired = !campaign.isLive && new Date() > new Date(campaign.endDate);
  
  const getDaysLeft = () => {
    const end = new Date(campaign.endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff} days left` : 'Ends today';
  };

  return (
    <View style={[styles.card, isExpired && { opacity: 0.6 }]}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>{campaign.title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{campaign.type}</Text>
        </View>
      </View>
      
      <Text style={styles.desc} numberOfLines={2}>{campaign.description}</Text>
      
      <View style={styles.bottomRow}>
        <View style={styles.bottomLeft}>
          <View style={styles.pointsPill}>
            <Text style={styles.pointsPillTxt}>+{campaign.bonusPoints} pts</Text>
          </View>
          <Text style={styles.daysTxt}>{isExpired ? 'Ended' : getDaysLeft()}</Text>
        </View>
        
        {!isExpired && (
          <TouchableOpacity onPress={onQuizPress}>
            <Text style={styles.actionBtn}>Take Quiz →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, ...SHADOW.card },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1, marginRight: 8 },
  badge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primaryMuted },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: COLORS.primaryDark },
  desc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pointsPill: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pointsPillTxt: { color: COLORS.white, fontSize: 11, fontWeight: 'bold' },
  daysTxt: { fontSize: 12, color: COLORS.textSecondary },
  actionBtn: { color: COLORS.primary, fontWeight: '600', fontSize: 14 }
});
