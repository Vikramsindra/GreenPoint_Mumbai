// filepath: app/app/(auth)/collector-signup.jsx
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
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { COLORS, SPACING } from "../../constants/theme";

export default function CollectorSignupScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    collectorId: "",
    wardId: "",
    password: "",
    confirm: "",
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
    if (form.collectorId.length < 3)
      newErrors.collectorId = "Collector ID must be at least 3 characters";
    if (!form.wardId) newErrors.wardId = "Ward selection is required";
    if (form.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (form.password !== form.confirm)
      newErrors.confirm = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCollectorIdChange = (text) => {
    setForm({ ...form, collectorId: text });
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      await register({
        name: form.name,
        phone: form.phone,
        collectorId: form.collectorId,
        wardId: form.wardId,
        password: form.password,
        role: "collector",
      });
      router.replace("/(tabs)/home");
    } catch (e) {
      setErrors({ form: e.message || "Registration failed" });
    }
  };

  const handleSwitchToCitizen = () => {
    router.push("/(auth)/register");
  };

  const handleHelpSupport = () => {
    // Navigate to help/support page or open contact
    alert("Help & Support: Contact your Ward Office for Collector ID");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Green Gradient Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>BMC Collector Portal</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.formContainer}>
            {/* Full Name Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                value={form.name}
                onChangeText={(t) => setForm({ ...form, name: t })}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            {/* Phone Number Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="10-digit phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={10}
                value={form.phone}
                onChangeText={(t) => setForm({ ...form, phone: t })}
              />
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            {/* Collector ID Field - Primary Field */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Official BMC Collector ID</Text>
                <TouchableOpacity style={styles.infoIcon}>
                  <Text style={styles.infoText}>ℹ</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.collectorIdContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.collectorIdInput,
                    errors.collectorId && styles.inputError,
                  ]}
                  placeholder="Enter your Collector ID"
                  placeholderTextColor="#9CA3AF"
                  value={form.collectorId}
                  onChangeText={handleCollectorIdChange}
                />
              </View>
              {errors.collectorId && (
                <Text style={styles.errorText}>{errors.collectorId}</Text>
              )}
              <Text style={styles.infoCaption}>
                Provided by your Ward Office
              </Text>
            </View>

            {/* Ward Selection Dropdown */}
            <View style={styles.field}>
              <Text style={styles.label}>Ward Selection</Text>
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
                          form.wardId === ward && styles.wardOptionTextSelected,
                        ]}
                      >
                        {ward}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {errors.wardId && (
                <Text style={styles.errorText}>{errors.wardId}</Text>
              )}
            </View>

            {/* Password Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={form.password}
                onChangeText={(t) => setForm({ ...form, password: t })}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Confirm Password Field */}
            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, errors.confirm && styles.inputError]}
                placeholder="Re-enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={form.confirm}
                onChangeText={(t) => setForm({ ...form, confirm: t })}
              />
              {errors.confirm && (
                <Text style={styles.errorText}>{errors.confirm}</Text>
              )}
            </View>

            {errors.form && <Text style={styles.formError}>{errors.form}</Text>}

            {/* Register Button - Squircle Green */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} size="large" />
              ) : (
                <Text style={styles.submitTxt}>Register as Collector</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Help & Support Link */}
          <TouchableOpacity style={styles.helpLink} onPress={handleHelpSupport}>
            <Text style={styles.helpLinkText}>Help & Support</Text>
          </TouchableOpacity>

          {/* Switch to Citizen Sign-Up */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleSwitchToCitizen}
          >
            <Text style={styles.secondaryBtnText}>
              Switch to Citizen Sign-Up
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: "#16a34a",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  backBtn: {
    marginBottom: SPACING.sm,
  },
  backTxt: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginTop: SPACING.sm,
  },
  scroll: {
    paddingBottom: 80,
  },
  formContainer: {
    marginHorizontal: SPACING.lg,
    backgroundColor: "white",
    borderRadius: 28,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: SPACING.xs,
    flex: 1,
  },
  infoIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  collectorIdContainer: {
    position: "relative",
  },
  collectorIdInput: {
    paddingRight: SPACING.md,
  },
  verifiedBadge: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  verificationCaption: {
    fontSize: 12,
    color: "#16a34a",
    marginTop: SPACING.xs,
    fontWeight: "500",
  },
  infoCaption: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: SPACING.xs,
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
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginTop: SPACING.sm,
    overflow: "hidden",
  },
  wardOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  wardOptionSelected: {
    backgroundColor: "#F0FDF4",
    borderLeftWidth: 3,
    borderLeftColor: "#16a34a",
  },
  wardOptionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  wardOptionTextSelected: {
    color: "#16a34a",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: SPACING.xs,
  },
  formError: {
    fontSize: 12,
    color: "#EF4444",
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  submitBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 28,
    paddingVertical: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.lg,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  submitTxt: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.5,
  },
  helpLink: {
    alignItems: "center",
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  helpLinkText: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  secondaryBtn: {
    marginHorizontal: SPACING.lg,
    borderWidth: 2,
    borderColor: "#16a34a",
    borderRadius: 28,
    paddingVertical: SPACING.md,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  bottomSpacing: {
    height: SPACING.xl,
  },
});
