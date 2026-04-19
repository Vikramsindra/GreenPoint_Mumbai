// filepath: app/components/WasteGuideCard.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOW } from '../constants/theme';

export default function WasteGuideCard({ category, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(category)} activeOpacity={0.7}>
      <View style={[styles.headerStrip, { backgroundColor: category.binColor }]} />
      <View style={styles.body}>
        <View style={styles.iconRow}>
          <Text style={styles.icon}>{category.icon}</Text>
          <Text style={styles.name} numberOfLines={1}>{category.name}</Text>
        </View>
        <View style={styles.examples}>
          {category.examples.slice(0, 3).map((ex, i) => (
             <Text key={i} style={styles.exampleText} numberOfLines={1}>• {ex}</Text>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: 130, backgroundColor: COLORS.white, borderRadius: 12, marginRight: 12, ...SHADOW.card, overflow: 'hidden' },
  headerStrip: { height: 8, width: '100%' },
  body: { padding: 12 },
  iconRow: { marginBottom: 8 },
  icon: { fontSize: 24, marginBottom: 4 },
  name: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  examples: { gap: 2 },
  exampleText: { fontSize: 11, color: COLORS.textSecondary }
});
