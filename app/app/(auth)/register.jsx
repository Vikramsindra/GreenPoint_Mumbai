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
    collectorId: "",
    wardId: "",
  });
  const [errors, setErrors] = useState({});
  const [wards] = useState([
    "N-WARD",
    "S-WARD",
    "E-WARD",
    "W-WARD",
    "C-WARD",
    "H-WARD",
  ]);
  const [showWardPicker, setShowWardPicker] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (form.name.length < 2)
      newErrors.name = "Name must be at least 2 characters";
    if (form.phone.length !== 10)
      newErrors.phone = "Phone must be exactly 10 digits";
    if (form.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (form.password !== form.confirm)
      newErrors.confirm = "Passwords do not match";

    // Collector-specific validation
    if (form.role === "collector") {
      if (form.collectorId.length < 3)
        newErrors.collectorId = "Collector ID must be at least 3 characters";
      if (!form.wardId) newErrors.wardId = "Ward selection is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRoleChange = (role) => {
    setForm({ ...form, role });
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      const registerData = {
        name: form.name,
        phone: form.phone,
        password: form.password,
        role: form.role,
      };

      // Include collector-specific fields if role is collector
      if (form.role === "collector") {
        registerData.collectorId = form.collectorId;
        registerData.wardId = form.wardId;
      }

      await register(registerData);
      router.replace("/(tabs)/home");
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
          {form.role === "collector"
            ? "BMC Collector Portal"
            : "Create Account"}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Role Selection - First Step */}
          <View style={styles.field}>
            <Text style={styles.label}>Select Role</Text>
            <View style={styles.roleRow}>
              {["citizen", "collector"].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleBtn,
                    form.role === r && styles.roleBtnActive,
                  ]}
                  onPress={() => handleRoleChange(r)}
                >
                  <Text style={styles.roleIcon}>
                    {r === "citizen" ? "👤" : "🏛️"}
                  </Text>
                  <Text
                    style={[
                      styles.roleTxt,
                      form.role === r && styles.roleTxtActive,
                    ]}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Citizen Icon or Collector Info */}
          {form.role === "citizen" && (
            <View style={styles.illustrationContainer}>
              <View style={styles.citizenIconContainer}>
                <Text style={styles.citizenIcon}>👤</Text>
              </View>
              <Text style={styles.illustrationLabel}>Citizen Account</Text>
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
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              maxLength={10}
              value={form.phone}
              onChangeText={(t) => setForm({ ...form, phone: t })}
            />
            {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}
          </View>

          {/* Collector-specific fields */}
          {form.role === "collector" && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Official BMC Collector ID *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.collectorId && styles.inputError,
                  ]}
                  placeholder="Enter your Collector ID"
                  placeholderTextColor="#9CA3AF"
                  value={form.collectorId}
                  onChangeText={(t) => setForm({ ...form, collectorId: t })}
                />
                {errors.collectorId && (
                  <Text style={styles.error}>{errors.collectorId}</Text>
                )}
                <Text style={styles.infoCaption}>
                  Provided by your Ward Office
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Ward Selection *</Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.wardSelector,
                    !form.wardId && styles.wardPlaceholder,
                  ]}
                  onPress={() => setShowWardPicker(!showWardPicker)}
                >
                  <Text
                    style={
                      form.wardId
                        ? styles.wardSelectedText
                        : styles.wardPlaceholderText
                    }
                  >
                    {form.wardId || "Select your Ward"}
                  </Text>
                  <Text style={styles.wardDropdownArrow}>▼</Text>
                </TouchableOpacity>
                {showWardPicker && (
                  <View style={styles.wardPickerContainer}>
                    {wards.map((ward) => (
                      <TouchableOpacity
                        key={ward}
                        style={[
                          styles.wardOption,
                          form.wardId === ward && styles.wardOptionSelected,
                        ]}
                        onPress={() => {
                          setForm({ ...form, wardId: ward });
                          setShowWardPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.wardOptionText,
                            form.wardId === ward &&
                              styles.wardOptionTextSelected,
                          ]}
                        >
                          {ward}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {errors.wardId && (
                  <Text style={styles.error}>{errors.wardId}</Text>
                )}
              </View>
            </>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
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
              <Text style={styles.submitTxt}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            style={styles.loginLink}
          >
            <Text style={styles.loginTxt}>Already have an account? Login</Text>
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
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginTop: SPACING.sm,
  },
  scroll: { padding: SPACING.xxl },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
  infoCaption: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  wardSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wardPlaceholder: {
    backgroundColor: "#F9FAFB",
  },
  wardSelectedText: {
    color: "#1F2937",
    fontWeight: "500",
  },
  wardPlaceholderText: {
    color: "#9CA3AF",
  },
  wardDropdownArrow: {
    color: "#6B7280",
    fontSize: 12,
  },
  wardPickerContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginTop: 8,
    overflow: "hidden",
  },
  wardOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  wardOptionSelected: {
    backgroundColor: "#F0FDF4",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  wardOptionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  wardOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  formError: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  roleRow: { flexDirection: "row", gap: 12 },
  roleBtn: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  roleTxt: { color: COLORS.textSecondary, fontWeight: "600" },
  roleTxtActive: { color: COLORS.white },
  illustrationContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  citizenIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  citizenIcon: {
    fontSize: 40,
  },
  illustrationLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
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
  loginTxt: { color: COLORS.primary, fontSize: 14, fontWeight: "500" },
});
