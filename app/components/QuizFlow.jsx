// filepath: app/components/QuizFlow.jsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../services/api';
import { COLORS, SPACING, SHADOW } from '../constants/theme';

export default function QuizFlow({ campaign, questions, onClose, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const handleNext = () => {
    if (selectedOption === null) return;
    
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedOption;
    setAnswers(newAnswers);
    
    if (isLast) {
      submitQuiz(newAnswers);
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(answers[currentIndex + 1] ?? null);
    }
  };

  const submitQuiz = async (finalAnswers) => {
    setIsSubmitting(true);
    try {
      const res = await api.submitQuiz(campaign._id, finalAnswers);
      setResult(res.data);
      if (onComplete) onComplete(res.data);
    } catch (e) {
      alert('Failed to submit quiz');
    }
    setIsSubmitting(false);
  };

  if (result) {
    return (
      <Modal visible animationType="slide">
        <SafeAreaView style={[styles.container, { backgroundColor: COLORS.white }]} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
            
            <View style={[styles.scoreCirc, { borderColor: result.passed ? COLORS.success : COLORS.warning }]}>
              <Text style={styles.scoreText}>{result.score}%</Text>
            </View>
            
            <Text style={[styles.resHeading, { color: result.passed ? COLORS.success : COLORS.warning }]}>
              {result.passed ? 'Passed! 🎉' : 'Not quite 😕'}
            </Text>
            
            {result.passed && (
              <Text style={styles.resPoints}>+{result.pointsAwarded} GreenPoints earned!</Text>
            )}

            <Text style={styles.resSummary}>You got {result.correct} out of {result.total} right.</Text>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnTxt}>Close</Text>
            </TouchableOpacity>

          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.hdrBtn}>✕</Text></TouchableOpacity>
          <Text style={styles.hdrProgress}>{currentIndex + 1} of {questions.length}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.campTitle}>{campaign.title}</Text>
          <Text style={styles.qText}>{currentQ.question}</Text>
          
          <View style={styles.optList}>
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedOption === i;
              return (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.optBtn, isSelected && styles.optBtnSelected]}
                  onPress={() => setSelectedOption(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optTxt, isSelected && styles.optTxtSelected]}>
                    {['A', 'B', 'C', 'D'][i]}. {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => {
               setCurrentIndex(currentIndex - 1);
               setSelectedOption(answers[currentIndex - 1]);
            }}>
              <Text style={styles.backBtnTxt}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.nextBtn, selectedOption === null && { opacity: 0.5 }, currentIndex > 0 && { flex: 2 }]} 
            onPress={handleNext} 
            disabled={selectedOption === null || isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextBtnTxt}>{isLast ? 'Submit' : 'Next'}</Text>}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  hdrBtn: { fontSize: 20, color: COLORS.textSecondary },
  hdrProgress: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  progressTrack: { height: 4, backgroundColor: COLORS.border, width: '100%' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  content: { padding: 24 },
  campTitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, textAlign: 'center' },
  qText: { fontSize: 20, fontWeight: '600', color: COLORS.text, textAlign: 'center', lineHeight: 28, marginBottom: 32 },
  optList: { gap: 12 },
  optBtn: { backgroundColor: COLORS.white, minHeight: 56, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', ...SHADOW.card },
  optBtnSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  optTxt: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  optTxtSelected: { color: COLORS.primaryDark, fontWeight: 'bold' },
  footer: { flexDirection: 'row', padding: 20, gap: 12 },
  backBtn: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  backBtnTxt: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  nextBtn: { flex: 1, height: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  nextBtnTxt: { fontSize: 16, color: COLORS.white, fontWeight: 'bold' },
  
  scoreCirc: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, justifyContent: 'center', alignItems: 'center', marginVertical: 30 },
  scoreText: { fontSize: 32, fontWeight: 'bold', color: COLORS.text },
  resHeading: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  resPoints: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  resSummary: { fontSize: 16, color: COLORS.textSecondary },
  closeBtn: { marginTop: 40, backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12 },
  closeBtnTxt: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 }
});
