import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useAuth } from "@/providers/AuthProvider";
import * as Network from "expo-network";

export default function LoginScreen() {
  const auth = useAuth();
  const { login, register, updatePassword, isHydrating, staff, logoutReason } = auth;

  useEffect(() => {
    console.log("[Login] auth keys:", Object.keys(auth));
  }, [auth]);

  const Theme = useThemeColor();
  const styles = useMemo(() => createStyles(Theme), [Theme]);

  const [staffId, setStaffId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPass, setShowPass] = useState<boolean>(false);

  const [netState, setNetState] = useState<Network.NetworkState | null>(null);
  const [deviceIp, setDeviceIp] = useState<string | null>(null);

  useEffect(() => {
    const checkNet = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        setNetState(state);
        const ip = await Network.getIpAddressAsync();
        setDeviceIp(ip);
      } catch (e) {
        console.log("[Login] network check error", e);
      }
    };
    checkNet();
    const sub = Network.addNetworkStateListener(setNetState);
    return () => sub.remove();
  }, []);

  const isLocalApi = useMemo(() => {
    const url = process.env.EXPO_PUBLIC_API_URL || "";
    return url.includes("192.168.") || url.includes("10.") || url.includes("localhost") || url.includes("127.0.0.1");
  }, []);

  const showNetworkWarning = useMemo(() => {
    if (!netState) return false;
    // Warning if API is local but phone is on Cellular OR not connected
    if (isLocalApi && (netState.type === Network.NetworkStateType.CELLULAR || !netState.isConnected)) {
      return true;
    }
    return false;
  }, [netState, isLocalApi]);

  const canSubmit = useMemo(() => {
    if (isRegistering) {
      return !isHydrating && !!staffId.trim() && !!password && !!name.trim() && !!email.trim();
    }
    return !isHydrating && !!staffId.trim() && !!password;
  }, [isHydrating, password, staffId, name, email, isRegistering]);

  const formatRemaining = useCallback((untilMs: number) => {
    const sec = Math.max(0, Math.ceil((untilMs - Date.now()) / 1000));
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    if (min <= 0) return `${rem}s`;
    return `${min}m ${rem}s`;
  }, []);

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      let res;
      if (isRegistering) {
        res = await register(staffId, password, name, email);
      } else {
        res = await login(staffId, password);
      }

      if (!res.ok) {
        const detail = ("lockedUntilMs" in res && res.lockedUntilMs)
          ? `${res.message}\nTry again in ${formatRemaining(res.lockedUntilMs as number)}.`
          : res.message;
        Alert.alert(isRegistering ? "Registration failed" : "Login failed", detail);
        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return;
      }

      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.replace("/(tabs)");
    } catch (e) {
      console.log("[Login] error", e);
      Alert.alert("Error", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, formatRemaining, login, register, password, staffId, name, email, isRegistering]);

  useEffect(() => {
    if (staff) {
      router.replace("/(tabs)");
    }
  }, [staff]);

  return (
    <View style={styles.page} testID="login-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={Theme.card === "#FFFFFF" ? ["#FF8C00", "#FF4500"] : ["#000000", "#121212"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bg}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Image
              source={require("@/assets/images/poly.png")}
              style={styles.logoLarge}
            />
            <Text style={styles.logoDesc}>Cyber Physical Systems & Security</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 }}>
              API: {process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/trpc"}
            </Text>
            {logoutReason === "expired" && (
              <View style={styles.notice} testID="login-expired-notice">
                <Text style={styles.noticeTitle}>Session expired</Text>
                <Text style={styles.noticeText}>
                  You were signed out due to inactivity. Please sign in again.
                </Text>
              </View>
            )}
          </View>

          {showNetworkWarning && (
            <View style={[styles.notice, { backgroundColor: "rgba(255, 100, 100, 0.2)", borderColor: "rgba(255, 100, 100, 0.4)", marginBottom: 20 }]}>
              <Text style={[styles.noticeTitle, { color: "#FF6B6B" }]}>⚠️ Connectivity Warning</Text>
              <Text style={styles.noticeText}>
                The app is trying to reach a local backend ({process.env.EXPO_PUBLIC_API_URL}), but your device is on {netState?.type === Network.NetworkStateType.CELLULAR ? "Cellular data" : "no internet"}.
                {"\n\n"}To fix this:
                {"\n"}• Connect your phone to the SAME Wi-Fi as your computer.
                {"\n"}• Or use a public backend URL in the .env file.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isRegistering ? "Create Staff Account" : "Staff Login"}</Text>

            {isRegistering && (
              <>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={"#98A2B3"}
                  autoCapitalize="words"
                  style={styles.input}
                />

                <Text style={[styles.label, styles.mt12]}>Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e.g. john@university.edu"
                  placeholderTextColor={"#98A2B3"}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <View style={styles.mt12} />
              </>
            )}

            <Text style={styles.label}>Staff ID</Text>
            <TextInput
              testID="login-staff-id"
              value={staffId}
              onChangeText={setStaffId}
              placeholder="e.g. 1001"
              placeholderTextColor={"#98A2B3"}
              autoCapitalize="none"
              keyboardType="default"
              style={styles.input}
            />

            <Text style={[styles.label, styles.mt12]}>Password</Text>
            <View style={styles.passwordInputWrap}>
              <TextInput
                testID="login-password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={"#98A2B3"}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                style={styles.input}
              />
              <Pressable
                onPress={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
              >
                {showPass ? <EyeOff size={18} color={Theme.muted} /> : <Eye size={18} color={Theme.muted} />}
              </Pressable>
            </View>

            <Pressable
              testID="login-submit"
              onPress={onSubmit}
              disabled={!canSubmit || isSubmitting}
              style={({ pressed }) => [
                styles.btn,
                pressed && styles.btnPressed,
                (!canSubmit || isSubmitting) && styles.btnDisabled,
              ]}
            >
              <Text style={styles.btnText}>
                {isSubmitting ? (isRegistering ? "Creating account…" : "Signing in…") : (isRegistering ? "Create Account" : "Sign in")}
              </Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              onPress={() => setIsRegistering(!isRegistering)}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.btnPressed
              ]}
            >
              <Text style={styles.secondaryBtnText}>
                {isRegistering ? "Back to Sign In" : "Don't have an account? Create Account"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            Offline-ready sessions • Export PDF reports
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (Theme: any) =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: Theme.background,
    },
    bg: {
      ...StyleSheet.absoluteFillObject,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    brand: {
      marginBottom: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    logoLarge: {
      width: 100,
      height: 100,
      borderRadius: 24,
      marginBottom: 10,
    },
    logoDesc: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    notice: {
      marginTop: 12,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.20)",
      padding: 12,
    },
    noticeTitle: {
      color: "#FFFFFF",
      fontWeight: "900",
      fontSize: 12,
    },
    noticeText: {
      marginTop: 4,
      color: "rgba(255,255,255,0.78)",
      fontWeight: "600",
      fontSize: 12,
      lineHeight: 16,
    },
    card: {
      backgroundColor: Theme.card,
      borderRadius: 28,
      padding: 20,
      borderWidth: 1,
      borderColor: Theme.border,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    cardTitle: {
      color: Theme.text,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 12,
    },
    label: {
      fontSize: 12,
      color: Theme.muted,
      fontWeight: "800",
      marginBottom: 8,
    },
    mt12: {
      marginTop: 12,
    },
    input: {
      height: 48,
      borderRadius: 14,
      paddingHorizontal: 12,
      backgroundColor: Theme.card === "#FFFFFF" ? "#F5F0EB" : "#1A1A1A",
      borderWidth: 1,
      borderColor: Theme.border,
      color: Theme.text,
      fontSize: 14,
      fontWeight: "700",
    },
    passwordInputWrap: {
      position: "relative",
    },
    eyeBtn: {
      position: "absolute",
      right: 12,
      top: 14,
    },
    btn: {
      marginTop: 20,
      height: 54,
      borderRadius: 20,
      backgroundColor: Theme.tint,
      alignItems: "center",
      justifyContent: "center",
    },
    btnPressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.95,
    },
    btnDisabled: {
      opacity: 0.55,
    },
    btnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
    },
    divider: {
      height: 1,
      backgroundColor: Theme.border,
      marginVertical: 20,
    },
    secondaryBtn: {
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: Theme.tint,
      backgroundColor: Theme.card === "#FFFFFF" ? "rgba(255,69,0,0.05)" : "transparent",
    },
    secondaryBtnText: {
      color: Theme.tint,
      fontSize: 13,
      fontWeight: "800",
    },
    hintWrap: {
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: Theme.border,
      paddingTop: 12,
    },
    hintTitle: {
      color: Theme.muted,
      fontSize: 12,
      fontWeight: "900",
      marginBottom: 6,
    },
    hintText: {
      color: Theme.text,
      fontSize: 13,
      fontWeight: "800",
    },
    footer: {
      marginTop: 14,
      textAlign: "center",
      color: "rgba(255,255,255,0.72)",
      fontSize: 12,
      fontWeight: "600",
    },
  });
