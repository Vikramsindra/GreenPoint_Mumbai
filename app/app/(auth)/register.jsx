// filepath: app/app/(auth)/register.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { COLORS, SPACING } from "../../constants/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    confirm: "",
    role: "citizen",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (form.name.trim().length < 2)
      newErrors.name = "Name must be at least 2 characters";
    if (form.phone.trim().length !== 10)
      newErrors.phone = "Phone must be exactly 10 digits";
    if (form.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (form.password !== form.confirm)
      newErrors.confirm = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRoleChange = (role) => {
    setForm({ ...form, role });
    setErrors({});
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      const registerData = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
      };

      await register(registerData);
      // RootLayout will navigate based on user.role
    } catch (e) {
      setErrors({ form: e.message || "Registration failed" });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {form.role === "society_representative"
            ? "Society Representative Signup"
            : "Create Citizen Account"}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Role Selection */}
          <View style={styles.field}>
            <Text style={styles.label}>Select Account Type</Text>
            <View style={styles.roleGrid}>
              {[
                {
                  id: "citizen",
                  icon: "👤",
                  title: "Citizen",
                  desc: "Household resident segregating waste and earning GreenPoints",
                },
                {
                  id: "society_representative",
                  icon: "🏢",
                  title: "Society Representative",
                  desc: "Cooperative Housing Society manager registering society for municipal collections",
                },
              ].map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roleBtn,
                    form.role === r.id && styles.roleBtnActive,
                  ]}
                  onPress={() => handleRoleChange(r.id)}
                >
                  <Text style={styles.roleIcon}>{r.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.roleTxt,
                        form.role === r.id && styles.roleTxtActive,
                      ]}
                    >
                      {r.title}
                    </Text>
                    <Text
                      style={[
                        styles.roleSubtext,
                        form.role === r.id && styles.roleSubtextActive,
                      ]}
                    >
                      {r.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Role Info Box */}
          {form.role === "society_representative" ? (
            <View style={styles.roleDescription}>
              <Text style={styles.roleDescLabel}>🏢 Society Representative Registration</Text>
              <Text style={styles.roleDescText}>
                Create your representative account first. After logging in, you will be prompted to submit your Society Application for Ward Officer approval.
              </Text>
            </View>
          ) : (
            <View style={styles.illustrationContainer}>
              <View style={styles.citizenIconContainer}>
                <Text style={styles.citizenIcon}>🌱</Text>
              </View>
              <Text style={styles.illustrationLabel}>Resident Household Account</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />
            {errors.name && <Text style={styles.error}>{errors.name}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mobile Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={10}
              value={form.phone}
              onChangeText={(t) => setForm({ ...form, phone: t })}
            />
            {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password (minimum 6 characters)</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a secure password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={form.password}
              onChangeText={(t) => setForm({ ...form, password: t })}
            />
            {errors.password && (
              <Text style={styles.error}>{errors.password}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={form.confirm}
              onChangeText={(t) => setForm({ ...form, confirm: t })}
            />
            {errors.confirm && (
              <Text style={styles.error}>{errors.confirm}</Text>
            )}
          </View>

          {errors.form && <Text style={styles.formError}>{errors.form}</Text>}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitTxt}>
                {form.role === "society_representative"
                  ? "Create Representative Account"
                  : "Register as Citizen"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            style={styles.loginLink}
          >
            <Text style={styles.loginTxt}>Already have an account? Login here</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: {
    backgroundColor: "#16a34a",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  backTxt: { color: "white", fontSize: 16, fontWeight: "600" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginTop: SPACING.sm,
  },
  scroll: { 
    padding: SPACING.xxl,
    flexGrow: 1,
    paddingBottom: SPACING.xxxl,
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
  formError: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  roleGrid: { 
    flexDirection: "column", 
    gap: 10,
    marginBottom: 12,
  },
  roleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FAFAFA",
  },
  roleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleIcon: {
    fontSize: 28,
  },
  roleTxt: { 
    color: COLORS.text, 
    fontWeight: "700",
    fontSize: 15,
  },
  roleTxtActive: { color: COLORS.white },
  roleSubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  roleSubtextActive: {
    color: "#E0F2FE",
  },
  roleDescription: {
    backgroundColor: "#F0FDF4",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  roleDescLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },
  roleDescText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  illustrationContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  citizenIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  citizenIcon: {
    fontSize: 32,
  },
  illustrationLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  submitTxt: { color: COLORS.white, fontSize: 16, fontWeight: "bold" },
  loginLink: { marginTop: 20, alignItems: "center" },
  loginTxt: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
});
