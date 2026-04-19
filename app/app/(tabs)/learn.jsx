import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOW, RADIUS, FONTS } from '../../constants/theme';
import { useUiStore } from '../../store/uiStore';
import * as api from '../../services/api';
import CampaignCard from '../../components/CampaignCard';
import WasteGuideCard from '../../components/WasteGuideCard';
import WasteGuideModal from '../../components/WasteGuideModal';
import QuizFlow from '../../components/QuizFlow';

export default function LearnScreen() {
  const [campaigns, setCampaigns] = useState([]);
  const [guideCategories, setGuideCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedGuide, setSelectedGuide] = useState(null);
  
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  
  const { openMenu } = useUiStore();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [campRes, guideRes] = await Promise.all([
        api.getCampaigns(),
        api.getWasteGuide()
      ]);
      setCampaigns(campRes.data || []);
      setGuideCategories(guideRes.data || []);
    } catch (error) {
      console.error('Failed to load learn data', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTakeQuiz = async (campaign) => {
    setLoadingQuiz(true);
    try {
      const res = await api.getQuiz(campaign._id);
      setQuizQuestions(res.data.questions || []);
      setSelectedCampaign(campaign);
    } catch (e) {
      alert('Failed to load quiz');
    }
    setLoadingQuiz(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
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
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
        >
          
          <View style={styles.header}>
            <Text style={styles.title}>Learn & Earn</Text>
            <Text style={styles.subtitle}>Master waste segregation and participate in campaigns to earn more GreenPoints.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Waste Guide</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {guideCategories.map(cat => (
                <WasteGuideCard key={cat._id || cat.id} category={cat} onPress={setSelectedGuide} />
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Active Campaigns</Text>
            {loadingQuiz && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 10 }} />}
            <View style={styles.campaignList}>
              {campaigns.map(camp => (
                <CampaignCard 
                  key={camp._id || camp.id} 
                  campaign={camp} 
                  onQuizPress={() => handleTakeQuiz(camp)} 
                />
              ))}
              {campaigns.length === 0 && !isLoading && (
                <Text style={styles.emptyText}>No active campaigns right now.</Text>
              )}
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>

      <WasteGuideModal 
        visible={!!selectedGuide} 
        category={selectedGuide} 
        onClose={() => setSelectedGuide(null)} 
      />

      {selectedCampaign && quizQuestions.length > 0 && (
        <QuizFlow 
          campaign={selectedCampaign} 
          questions={quizQuestions} 
          onClose={() => setSelectedCampaign(null)}
          onComplete={() => {
            // refresh data if needed
            loadData();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  scrollContent: { paddingBottom: 100 },
  header: { padding: SPACING.lg },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500', lineHeight: 22 },
  section: { marginBottom: SPACING.xxl },
  sectionHeading: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  horizontalList: { paddingHorizontal: SPACING.lg, paddingBottom: 10 },
  campaignList: { paddingHorizontal: SPACING.lg, gap: 16 },
  emptyText: { color: COLORS.textSecondary, fontStyle: 'italic', paddingHorizontal: SPACING.lg }
});
