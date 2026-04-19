// filepath: app/app/(tabs)/violations.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import ViolationCard from '../../components/ViolationCard';
import EmptyState from '../../components/EmptyState';
import * as api from '../../services/api';
import { COLORS, SPACING, SHADOW } from '../../constants/theme';
import { useUiStore } from '../../store/uiStore';

export default function ViolationsScreen() {
  const { openMenu } = useUiStore();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appealModal, setAppealModal] = useState({ visible: false, violation: null, text: '', photo: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getMyViolations();
      setViolations(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const total = violations.length;
  const pending = violations.filter(v => v.status === 'PENDING').length;
  const resolved = violations.filter(v => v.status === 'RESOLVED').length;

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });
    if (!result.canceled) {
      setAppealModal(p => ({ ...p, photo: result.assets[0].uri }));
    }
  };

  const handleSubmitAppeal = async () => {
    if (appealModal.text.length < 20) {
      alert('Appeal reason must be at least 20 characters'); return;
    }
    try {
      await api.submitAppeal(appealModal.violation._id, appealModal.text, appealModal.photo);
      setAppealModal({ visible: false, violation: null, text: '', photo: '' });
      loadData();
    } catch (e) {
      alert('Failed to submit appeal');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.appBarIcon}>
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

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Violations</Text>
        <Text style={{ fontSize: 24 }}>📋</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.statCard}><Text style={styles.statNum}>{total}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNum, {color: COLORS.danger}]}>{pending}</Text><Text style={styles.statLabel}>Pending</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNum, {color: COLORS.success}]}>{resolved}</Text><Text style={styles.statLabel}>Resolved</Text></View>
      </View>

      <FlatList
        data={violations}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        renderItem={({ item }) => (
          <ViolationCard 
            violation={item} 
            onAppeal={() => setAppealModal({ visible: true, violation: item, text: '', photo: '' })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm }} />}
        ListEmptyComponent={
          !loading ? <EmptyState emoji="✅" title="No violations on record" subtitle="Keep segregating correctly to stay violation-free!" /> : null
        }
      />

      <Modal visible={appealModal.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appeal Violation</Text>
              <TouchableOpacity onPress={() => setAppealModal({ visible: false, violation: null, text: '', photo: '' })}>
                 <Text style={{ fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginBottom: 16 }}>
               <TextInput 
                 style={styles.textArea} 
                 placeholder="Reason for Appeal (min 20 chars)" 
                 multiline 
                 numberOfLines={4}
                 value={appealModal.text}
                 onChangeText={t => setAppealModal(p => ({...p, text: t}))}
               />
               <Text style={styles.charCount}>{appealModal.text.length}/200</Text>
            </View>
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
               <Text style={styles.photoBtnTxt}>{appealModal.photo ? 'Photo Added ✅' : '+ Add Photo (Optional)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitAppeal}>
               <Text style={styles.submitBtnTxt}>Submit Appeal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  appBarIcon: { padding: 4 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.lg },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: 12, marginBottom: SPACING.md },
  statCard: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalPanel: { backgroundColor: COLORS.white, padding: SPACING.xl, borderTopLeftRadius: 20, borderTopRightRadius: 20, ...SHADOW.modal },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  textArea: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, height: 100, padding: 12, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', marginTop: 4 },
  photoBtn: { backgroundColor: COLORS.background, padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  photoBtnTxt: { color: COLORS.textSecondary, fontWeight: '500' },
  submitBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnTxt: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 }
});
