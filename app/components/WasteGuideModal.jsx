// filepath: app/components/WasteGuideModal.jsx
import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/theme';

export default function WasteGuideModal({ visible, category, onClose }) {
  if (!category) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }} edges={['top']}>
        
        <View style={[styles.header, { backgroundColor: category.binColor }]}>
          <View>
            <Text style={styles.headerTitle}>{category.icon} {category.name}</Text>
            <Text style={styles.headerSubtitle}>{category.binLabel}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>What goes in?</Text>
            {category.examples.map((ex, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={[styles.bullet, { backgroundColor: category.binColor }]} />
                <Text style={styles.bulletText}>{ex}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: COLORS.danger }]}>❌ Common Mistakes</Text>
            {category.commonMistakes.map((ex, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.xIcon}>✕</Text>
                <Text style={styles.bulletText}>{ex}</Text>
              </View>
            ))}
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipText}>💡 Tip: {category.tip}</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { padding: SPACING.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  closeBtn: { backgroundColor: 'rgba(0,0,0,0.2)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  content: { padding: SPACING.xl, paddingBottom: 60 },
  section: { marginBottom: SPACING.xl },
  sectionHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: COLORS.text },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, paddingRight: 16 },
  bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 12 },
  xIcon: { color: COLORS.danger, fontWeight: 'bold', fontSize: 12, marginTop: 2, marginRight: 12 },
  bulletText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  tipBox: { backgroundColor: COLORS.primaryLight, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primaryMuted },
  tipText: { fontSize: 14, color: COLORS.primaryDark, fontWeight: '500', lineHeight: 22 }
});
