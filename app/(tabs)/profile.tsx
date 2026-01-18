import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Eye, EyeOff, Lock, LogOut, Moon, Smartphone, Sun, User, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useAttendance } from "@/providers/AttendanceProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";

export default function ProfileScreen() {
    const { staff, logout, updatePassword } = useAuth();
    const { stats } = useAttendance();
    const { themeMode, setThemeMode } = useTheme();
    const Theme = useThemeColor();
    const styles = useMemo(() => createStyles(Theme), [Theme]);

    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const onLogout = () => {
        Alert.alert("Logout", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: () => logout("manual"),
            },
        ]);
    };

    return (
        <View style={styles.page}>
            <LinearGradient
                colors={Theme.card === "#FFFFFF" ? ["#FF8C00", "#FF4500"] : ["#000000", "#121212"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
            >
                <View style={styles.headerRow}>
                    <Image
                        source={require("@/assets/images/poly.jpg")}
                        style={styles.logo}
                    />
                    <Text style={styles.heroTitle}>Staff Profile</Text>
                </View>
                <View style={styles.avatarSpace}>
                    <View style={styles.avatarWrap}>
                        <LinearGradient
                            colors={["#FFA500", "#FF8C00"]}
                            style={styles.avatarGradient}
                        >
                            <User color="#FFFFFF" size={40} />
                        </LinearGradient>
                    </View>
                    <View style={styles.heroMeta}>
                        <Text style={styles.heroName}>{staff?.name ?? "Staff Member"}</Text>
                        <Text style={styles.heroId}>Faculty {staff?.staffId ?? "N/A"}</Text>
                    </View>
                </View>


            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>


                <Text style={styles.sectionTitle}>Security</Text>
                <Pressable
                    style={({ pressed }) => [
                        styles.actionRow,
                        pressed && { opacity: 0.7 }
                    ]}
                    onPress={() => setIsPasswordModalVisible(true)}
                >
                    <View style={[styles.tileIcon, { backgroundColor: Theme.background, marginBottom: 0 }]}>
                        <Lock size={18} color={Theme.tint} />
                    </View>
                    <Text style={styles.actionText}>Change Password</Text>
                    <ChevronRight size={18} color={Theme.muted} />
                </Pressable>

                <Modal
                    visible={isPasswordModalVisible}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setIsPasswordModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalOverlay}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Update Password</Text>
                                <Pressable onPress={() => setIsPasswordModalVisible(false)} style={styles.closeBtn}>
                                    <X size={20} color={Theme.text} />
                                </Pressable>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>New Password</Text>
                                <View style={styles.passwordInputWrap}>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Enter new password"
                                        placeholderTextColor={Theme.muted}
                                        secureTextEntry={!showPass}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                    />
                                    <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                                        {showPass ? <EyeOff size={18} color={Theme.muted} /> : <Eye size={18} color={Theme.muted} />}
                                    </Pressable>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Confirm Password</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Confirm new password"
                                    placeholderTextColor={Theme.muted}
                                    secureTextEntry={!showPass}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                            </View>

                            <Pressable
                                style={[styles.updateBtn, isUpdating && { opacity: 0.6 }]}
                                disabled={isUpdating}
                                onPress={async () => {
                                    if (!newPassword || newPassword.length < 6) {
                                        return Alert.alert("Error", "Password must be at least 6 characters.");
                                    }
                                    if (newPassword !== confirmPassword) {
                                        return Alert.alert("Error", "Passwords do not match.");
                                    }
                                    setIsUpdating(true);
                                    try {
                                        const res = await updatePassword(newPassword);
                                        if (res.ok) {
                                            Alert.alert("Success", "Password updated successfully.");
                                            setIsPasswordModalVisible(false);
                                            setNewPassword("");
                                            setConfirmPassword("");
                                        } else {
                                            Alert.alert("Error", res.message || "Failed to update password.");
                                        }
                                    } finally {
                                        setIsUpdating(false);
                                    }
                                }}
                            >
                                <Text style={styles.updateBtnText}>{isUpdating ? "Updating..." : "Update Password"}</Text>
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                <View style={{ height: 20 }} />

                <Text style={styles.sectionTitle}>Appearance</Text>
                <View style={styles.themeToggleContainer}>
                    <ThemeButton
                        active={themeMode === "light"}
                        onPress={() => setThemeMode("light")}
                        icon={<Sun size={18} color={themeMode === "light" ? "#FFFFFF" : Theme.text} />}
                        label="Light"
                        Theme={Theme}
                    />
                    <ThemeButton
                        active={themeMode === "dark"}
                        onPress={() => setThemeMode("dark")}
                        icon={<Moon size={18} color={themeMode === "dark" ? "#FFFFFF" : Theme.text} />}
                        label="Dark"
                        Theme={Theme}
                    />
                    <ThemeButton
                        active={themeMode === "system"}
                        onPress={() => setThemeMode("system")}
                        icon={<Smartphone size={18} color={themeMode === "system" ? "#FFFFFF" : Theme.text} />}
                        label="System"
                        Theme={Theme}
                    />
                </View>

                <Text style={styles.sectionTitle}>System Info</Text>
                <View style={styles.card}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>System Version</Text>
                        <Text style={styles.infoValue}>v2.4.0-stable</Text>
                    </View>
                    <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.infoLabel}>Last Sync</Text>
                        <Text style={styles.infoValue}>Just now</Text>
                    </View>
                </View>

                <Pressable
                    onPress={onLogout}
                    style={({ pressed }) => [
                        styles.logoutBtn,
                        pressed && styles.logoutBtnPressed,
                    ]}
                >
                    <LogOut color="#E11D48" size={20} />
                    <Text style={styles.logoutBtnText}>Sign Out Securely</Text>
                </Pressable>
                <Text style={styles.versionText}>Built with ❤️ for Educators</Text>
            </ScrollView>
        </View>
    );

    function ThemeButton({ active, onPress, icon, label, Theme }: any) {
        return (
            <Pressable
                onPress={onPress}
                style={[
                    styles.themeBtn,
                    active && styles.themeBtnActive,
                    { borderColor: Theme.border }
                ]}
            >
                <View style={[styles.themeBtnIcon, active && styles.themeBtnIconActive]}>
                    {icon}
                </View>
                <Text style={[styles.themeBtnLabel, active && styles.themeBtnLabelActive, { color: active ? "#FFFFFF" : Theme.text }]}>
                    {label}
                </Text>
            </Pressable>
        );
    }
}

const createStyles = (Theme: any) =>
    StyleSheet.create({
        page: {
            flex: 1,
            backgroundColor: Theme.background,
        },
        hero: {
            paddingTop: 56,
            paddingBottom: 24,
            paddingHorizontal: 20,
        },
        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
            alignSelf: "flex-start",
        },
        logo: {
            width: 36,
            height: 36,
            borderRadius: 8,
        },
        heroTitle: {
            color: "#FFFFFF",
            fontSize: 22,
            fontWeight: "900",
        },
        avatarSpace: {
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            gap: 16,
            marginBottom: 20,
        },
        avatarWrap: {
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
        },
        avatarGradient: {
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.15)",
        },
        heroMeta: {
            flex: 1,
        },
        heroName: {
            color: "#FFFFFF",
            fontSize: 22,
            fontWeight: "900",
            letterSpacing: -0.5,
        },
        heroId: {
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            marginTop: 2,
            fontWeight: "700",
            textTransform: "uppercase",
        },
        statsRow: {
            flexDirection: "row",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 24,
            paddingVertical: 16,
            paddingHorizontal: 12,
            width: "100%",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
        },
        statItem: {
            flex: 1,
            alignItems: "center",
        },
        statValue: {
            color: "#FFFFFF",
            fontSize: 20,
            fontWeight: "900",
        },
        statLabel: {
            color: "rgba(255,255,255,0.5)",
            fontSize: 11,
            fontWeight: "800",
            marginTop: 2,
            textTransform: "uppercase",
        },
        statDivider: {
            width: 1,
            backgroundColor: "rgba(255,255,255,0.1)",
            marginVertical: 4,
        },
        dashboardRow: {
            flexDirection: "row",
            alignItems: "center",
        },
        statBox: {
            flex: 1,
            alignItems: "center",
            gap: 4,
        },
        statBoxValue: {
            fontSize: 18,
            fontWeight: "900",
            color: Theme.text,
        },
        statBoxLabel: {
            fontSize: 11,
            fontWeight: "700",
            color: Theme.muted,
            textTransform: "uppercase",
        },
        statBoxDivider: {
            width: 1,
            height: 30,
            backgroundColor: Theme.border,
        },
        actionRow: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Theme.card,
            padding: 12,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: Theme.border,
            marginBottom: 16,
        },
        actionText: {
            flex: 1,
            marginLeft: 12,
            fontSize: 14,
            fontWeight: "800",
            color: Theme.text,
        },
        content: {
            flex: 1,
            padding: 20,
        },
        sectionTitle: {
            fontSize: 14,
            fontWeight: "900",
            color: Theme.muted,
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: 1,
        },
        grid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
        },
        tile: {
            width: "48%",
            backgroundColor: Theme.card,
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: Theme.border,
            alignItems: "center",
        },
        tileIcon: {
            width: 44,
            height: 44,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
        },
        tileLabel: {
            fontSize: 13,
            fontWeight: "800",
            color: Theme.text,
        },
        card: {
            backgroundColor: Theme.card,
            borderRadius: 24,
            paddingHorizontal: 20,
            borderWidth: 1,
            borderColor: Theme.border,
            marginBottom: 16,
        },
        themeToggleContainer: {
            flexDirection: "row",
            gap: 8,
            marginBottom: 24,
        },
        themeBtn: {
            flex: 1,
            backgroundColor: Theme.card,
            borderRadius: 20,
            padding: 12,
            alignItems: "center",
            borderWidth: 1,
        },
        themeBtnActive: {
            backgroundColor: Theme.tint,
            borderColor: Theme.tint,
        },
        themeBtnIcon: {
            marginBottom: 4,
        },
        themeBtnIconActive: {
            // Already handled in icon color
        },
        themeBtnLabel: {
            fontSize: 12,
            fontWeight: "800",
        },
        themeBtnLabelActive: {
            color: "#FFFFFF",
        },
        infoRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 18,
            borderBottomWidth: 1,
            borderBottomColor: Theme.border,
        },
        infoLabel: {
            color: Theme.text,
            fontSize: 14,
            fontWeight: "800",
        },
        infoValue: {
            color: Theme.muted,
            fontSize: 14,
            fontWeight: "700",
        },
        logoutBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: Theme.card === "#FFFFFF" ? "rgba(225,29,72,0.06)" : "#450A0A",
            paddingVertical: 16,
            borderRadius: 18,
            gap: 10,
            marginTop: 32,
            borderWidth: 1,
            borderColor: Theme.card === "#FFFFFF" ? "rgba(225,29,72,0.12)" : "#7F1D1D",
        },
        logoutBtnPressed: {
            opacity: 0.8,
            transform: [{ scale: 0.98 }],
        },
        logoutBtnText: {
            color: "#E11D48",
            fontSize: 15,
            fontWeight: "900",
        },
        versionText: {
            textAlign: "center",
            marginTop: 24,
            marginBottom: 40,
            fontSize: 12,
            color: Theme.muted,
            fontWeight: "600",
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
        },
        modalContent: {
            backgroundColor: Theme.card,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            padding: 24,
            paddingBottom: Platform.OS === "ios" ? 40 : 24,
        },
        modalHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: "900",
            color: Theme.text,
        },
        closeBtn: {
            padding: 4,
        },
        inputGroup: {
            marginBottom: 20,
        },
        inputLabel: {
            fontSize: 13,
            fontWeight: "800",
            color: Theme.muted,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 0.5,
        },
        modalInput: {
            backgroundColor: Theme.background,
            borderRadius: 16,
            padding: 16,
            color: Theme.text,
            fontSize: 16,
            fontWeight: "700",
            borderWidth: 1,
            borderColor: Theme.border,
        },
        passwordInputWrap: {
            position: "relative",
        },
        eyeBtn: {
            position: "absolute",
            right: 16,
            top: 16,
        },
        updateBtn: {
            backgroundColor: Theme.tint,
            paddingVertical: 18,
            borderRadius: 18,
            alignItems: "center",
            marginTop: 8,
            shadowColor: Theme.tint,
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 8,
        },
        updateBtnText: {
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: "900",
        },
    });
