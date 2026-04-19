// filepath: app/app/(tabs)/home.jsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, StatusBar, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { usePointsStore } from '../../store/pointsStore';
import { useUiStore } from '../../store/uiStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Rect, Path } from 'react-native-svg';
import { COLORS, SPACING, SHADOW, RADIUS, FONTS } from '../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { balance, history, isLoading, refresh } = usePointsStore();
  const { openMenu } = useUiStore();

  useEffect(() => {
    refresh();
  }, []);

  const fillRatio = Math.min(balance / 500, 1);
  
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Top App Bar */}
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
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Floating Gradient Card */}
        <LinearGradient
          colors={['#4ade80', '#0284c7']} // matching the screenshot's green-to-blueish gradient vibe
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.gradientTopRow}>
            <View style={styles.profileInfo}>
              <View style={styles.avatar}>
                <Text style={{fontSize: 20}}>🧑🏽</Text>
              </View>
              <View>
                <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] || 'Vikram'}!</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                  <Ionicons name="happy-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.statusText}> Active Citizen</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity style={styles.dropdownBtn}>
              <Text style={styles.dropdownText}>Daily</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <TextInput 
              placeholder="Search anything..." 
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
            />
            <Ionicons name="search" size={20} color="#9ca3af" />
          </View>
        </LinearGradient>

        {/* Metrics Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Civic Metrics</Text>
            <TouchableOpacity><Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} /></TouchableOpacity>
          </View>

          <View style={styles.metricsContainer}>
            {/* Left Card - Green Score */}
            <View style={[styles.metricCard, { backgroundColor: '#f0f9ff' }]}> 
              <View style={styles.metricCardHeader}>
                <Ionicons name="heart" size={16} color="#0ea5e9" />
                <Text style={[styles.metricCardTitle, { color: '#0ea5e9' }]}> Green Score</Text>
              </View>
              
              <View style={styles.ringContainer}>
                <Svg width={120} height={120} viewBox="0 0 100 100">
                  <Circle cx="50" cy="50" r="38" stroke="#bae6fd" strokeWidth="10" fill="none" />
                  <Circle 
                    cx="50" cy="50" r="38" 
                    stroke="#0284c7" 
                    strokeWidth="10" 
                    fill="none" 
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - fillRatio)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </Svg>
                <View style={styles.ringCenter}>
                  <Text style={styles.scoreNumber}>{balance}</Text>
                </View>
              </View>
            </View>

            {/* Right Card - Compliance */}
            <View style={[styles.metricCard, { backgroundColor: '#f0fdf4' }]}>
              <View style={styles.metricCardHeader}>
                <Ionicons name="happy" size={16} color="#22c55e" />
                <Text style={[styles.metricCardTitle, { color: '#22c55e' }]}> Compliance</Text>
              </View>
              
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, alignSelf: 'flex-start', marginLeft: 4, marginTop: 10 }}>Excellent!</Text>
              
              <View style={styles.chartContainer}>
                {/* Mocked bar chart following screenshot style */}
                <View style={{flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 75, marginTop: 10}}>
                   <View style={{width: 8, height: 15, borderRadius: 4, backgroundColor: '#bbf7d0'}} />
                   <View style={{width: 8, height: 30, borderRadius: 4, backgroundColor: '#bbf7d0'}} />
                   <View style={{width: 8, height: 50, borderRadius: 4, backgroundColor: '#86efac'}} />
                   <View style={{width: 8, height: 75, borderRadius: 4, backgroundColor: '#22c55e'}} />
                   <View style={{width: 8, height: 40, borderRadius: 4, backgroundColor: '#bbf7d0'}} />
                   <View style={{width: 8, height: 25, borderRadius: 4, backgroundColor: '#dcfce7'}} />
                   <View style={{width: 8, height: 10, borderRadius: 4, backgroundColor: '#dcfce7'}} />
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.paginationDots}>
             <View style={[styles.dot, styles.dotActive]} />
             <View style={styles.dot} />
             <View style={styles.dot} />
             <View style={styles.dot} />
          </View>
        </View>

        {/* Tracker Section - Now Dynamic Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity><Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} /></TouchableOpacity>
          </View>

          {history && history.length > 0 ? (
            history.slice(0, 5).map((event) => {
              const isEarn = event.type === 'EARN';
              const isPenalty = event.type === 'PENALTY';
              const iconName = isEarn ? 'leaf' : isPenalty ? 'warning' : 'gift';
              const activeColor = isEarn ? '#22c55e' : isPenalty ? '#ef4444' : '#0ea5e9';
              const bgColor = isEarn ? '#f0fdf4' : isPenalty ? '#fef2f2' : '#f0f9ff';
              
              return (
                <View key={event._id} style={styles.trackerCard}>
                  <View style={[styles.trackerIconBox, {backgroundColor: bgColor}]}>
                    <Ionicons name={iconName} size={28} color={activeColor} />
                  </View>
                  <View style={styles.trackerContent}>
                    <Text style={styles.trackerTitle}>{event.description}</Text>
                    <Text style={styles.trackerValue}>
                      {new Date(event.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </Text>
                  </View>
                  <Text style={{fontSize: 16, fontWeight: '800', color: activeColor}}>
                    {isEarn ? '+' : '-'}{event.points} pts
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={{padding: 30, alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: '#f1f5f9'}}>
               <Text style={{fontSize: 32, marginBottom: 8}}>📝</Text>
               <Text style={{color: COLORS.text, fontWeight: '700'}}>No activity yet</Text>
               <Text style={{color: COLORS.textSecondary, fontSize: 12, marginTop: 2}}>Log your first waste scan today!</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#F8FAFC',
  },
  appBarIcon: { padding: 4 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  
  scrollContent: { paddingBottom: 120 },
  
  gradientCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.squircleLg,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    ...SHADOW.floating,
  },
  gradientTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  greeting: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  statusText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' },
  
  dropdownBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 4, 
    backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md 
  },
  dropdownText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    height: 46,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },

  section: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },

  metricsContainer: { flexDirection: 'row', gap: SPACING.md },
  metricCard: {
    flex: 1,
    borderRadius: 24,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  metricCardHeader: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 16 },
  metricCardTitle: { fontSize: 14, fontWeight: '700' },
  
  ringContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  scoreStatus: { fontSize: 11, fontWeight: '600', color: COLORS.text },

  chartContainer: { width: '100%', alignItems: 'center' },

  paginationDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: SPACING.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  dotActive: { backgroundColor: '#0ea5e9' },

  trackerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...SHADOW.card,
  },
  trackerIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  trackerContent: { flex: 1 },
  trackerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  trackerValue: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
});
