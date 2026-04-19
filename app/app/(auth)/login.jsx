// filepath: app/app/(auth)/login.jsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator, StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleLogin = async () => {
    clearError();
    setValidationError('');
    
    if (phone.length !== 10) {
      setValidationError('Phone must be 10 digits');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }
    
    try {
      await login(phone, password);
      router.replace('/(tabs)/home');
    } catch (e) {
      // Error is handled in store
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.logoSection}>
            <Text style={styles.logoEmoji}>🌱</Text>
            <Text style={styles.appName}>GreenPoint Mumbai</Text>
            <Text style={styles.tagline}>Rewarding sustainable citizens</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>Welcome back</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                keyboardType="numeric"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={{ fontSize: 18 }}>{showPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {(validationError || error) ? (
              <Text style={styles.errorText}>{validationError || error}</Text>
            ) : null}

            <TouchableOpacity 
              style={[styles.loginBtn, isLoading && { opacity: 0.7 }]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
            <Text style={styles.registerText}>New to GreenPoint? <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Register here</Text></Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: SPACING.xxl 
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoEmoji: { fontSize: 48, marginBottom: 8 },
  appName: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4 },
  tagline: { fontSize: 14, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    ...SHADOW.card,
  },
  cardHeading: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 24 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  errorText: { color: COLORS.danger, fontSize: 13, marginBottom: 16 },
  loginBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  registerLink: { marginTop: 24, alignItems: 'center' },
  registerText: { fontSize: 14, color: COLORS.textSecondary },
});
