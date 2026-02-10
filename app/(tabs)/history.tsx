import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { Calendar, ChevronRight, Trash2, XCircle } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
    Alert,
    FlatList,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";

import Colors from "@/constants/colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useAttendance, type AttendanceSession } from "@/providers/AttendanceProvider";
import { useAuth } from "@/providers/AuthProvider";

export default function HistoryScreen() {
    const { notifyActivity } = useAuth();
    const {
        sessions,
        isHydrating,
        refreshHistory,
        isRefreshing,
        deleteSession,
        deleteAllSessions,
        exportSessionPdf,
        stats,
        selectedDate,
        setSelectedDate
    } = useAttendance();
    const [showPicker, setShowPicker] = React.useState(false);
    const Theme = useThemeColor();
    const styles = useMemo(() => createStyles(Theme), [Theme]);

    const onExport = useCallback(async (sessionId: string) => {
        notifyActivity();
        try {
            await exportSessionPdf(sessionId);
        } catch (e) {
            console.log("[History] export error", e);
            Alert.alert("Export failed", "Please try again.");
        }
    }, [exportSessionPdf, notifyActivity]);

    const onDelete = useCallback((sessionId: string) => {
        notifyActivity();
        Alert.alert(
            "Delete Session",
            "Are you sure you want to delete this attendance record?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteSession(sessionId);
                        if (Platform.OS !== "web") {
                            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    },
                },
            ]
        );
    }, [deleteSession, notifyActivity]);

    const SessionItem = useCallback(({ item }: { item: AttendanceSession }) => {
        const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

        const presentCount = item.students.reduce((acc, s) => acc + (s.status === "present" ? 1 : 0), 0);

        return (
            <Pressable
                onPress={() => {
                    notifyActivity();
                    router.push({
                        pathname: "/session/[sessionId]",
                        params: { sessionId: item.id },
                    });
                }}
                style={({ pressed }) => [
                    styles.sessionCard,
                    pressed && styles.cardPressed,
                ]}
            >
                <View style={styles.cardHeader}>
                    <View>
                        {item.subject?.code ? <Text style={styles.subjectCode}>{item.subject.code}</Text> : null}
                        <Text style={styles.dateLabel}>{dateStr}</Text>
                    </View>
                    <Pressable
                        onPress={() => onDelete(item.id)}
                        style={({ pressed }) => [
                            styles.deleteBtn,
                            pressed && styles.deleteBtnPressed,
                        ]}
                    >
                        <Trash2 size={18} color={Colors.light.danger} />
                    </Pressable>
                </View>

                <Text style={styles.sessionDetails} numberOfLines={2}>
                    {item.sessionDetails}
                </Text>

                <View style={styles.cardFooter}>
                    <View style={styles.countPill}>
                        <Text style={styles.countText}>
                            {presentCount}/{item.students.length} Present
                        </Text>
                    </View>
                    <View style={styles.arrowBox}>
                        <ChevronRight size={16} color={Colors.light.muted} />
                    </View>
                </View>
            </Pressable>
        );
    }, [notifyActivity, onDelete]);

    const onClearAll = useCallback(() => {
        Alert.alert(
            "Clear All History?",
            "This will permanently delete all attendance sessions from your device and the cloud. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: () => deleteAllSessions()
                }
            ]
        );
    }, [deleteAllSessions]);

    const onDateChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
        setShowPicker(false);
        if (event.type === "set" && date) {
            setSelectedDate(date);
        }
    }, [setSelectedDate]);

    const clearDate = useCallback(() => {
        setSelectedDate(null);
    }, [setSelectedDate]);

    React.useEffect(() => {
        if (!isHydrating && selectedDate && sessions.length === 0) {
            Alert.alert(
                "No Record Found",
                "There are no attendance records for the selected date.",
                [
                    { text: "Change Date", onPress: () => setShowPicker(true) },
                    { text: "Clear Filter", onPress: clearDate },
                    { text: "OK" }
                ]
            );
        }
    }, [isHydrating, sessions.length, selectedDate, clearDate]);

    return (
        <View style={styles.page}>
            <Stack.Screen
                options={{
                    title: "Attendance History",
                }}
            />

            <LinearGradient
                colors={Theme.card === "#FFFFFF" ? ["#FF8C00", "#FF4500"] : ["#000000", "#121212"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
            >
                <View style={styles.headerRow}>
                    <Image
                        source={require("@/assets/images/poly.png")}
                        style={styles.logo}
                    />
                    <Text style={styles.heroTitle}>Session History</Text>
                </View>
                <Text style={styles.heroSub}>Review and export past sessions</Text>

                <View style={styles.heroStats}>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{stats.totalSessions}</Text>
                        <Text style={styles.statLabel}>Records</Text>
                    </View>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{stats.totalStudents}</Text>
                        <Text style={styles.statLabel}>Total Marks</Text>
                    </View>
                </View>

                {sessions.length > 0 && (
                    <View style={styles.heroActions}>
                        <Pressable
                            onPress={() => setShowPicker(true)}
                            style={({ pressed }) => [
                                styles.actionBtn,
                                pressed && styles.actionBtnPressed,
                                !!selectedDate && styles.actionBtnActive
                            ]}
                        >
                            <Calendar size={16} color="#FFFFFF" />
                            <Text style={styles.actionText}>
                                {selectedDate ? selectedDate.toLocaleDateString() : "Filter Date"}
                            </Text>
                        </Pressable>

                        {!!selectedDate && (
                            <Pressable
                                onPress={clearDate}
                                style={({ pressed }) => [
                                    styles.actionBtn,
                                    pressed && styles.actionBtnPressed,
                                    { backgroundColor: "rgba(255,255,255,0.2)" }
                                ]}
                            >
                                <XCircle size={16} color="#FFFFFF" />
                                <Text style={styles.actionText}>Clear</Text>
                            </Pressable>
                        )}

                        <View style={{ flex: 1 }} />

                        <Pressable
                            onPress={onClearAll}
                            style={({ pressed }) => [
                                styles.clearAllBtn,
                                pressed && styles.clearAllBtnPressed
                            ]}
                        >
                            <Trash2 size={16} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.clearAllText}>Clear All</Text>
                        </Pressable>
                    </View>
                )}

                {showPicker && (
                    <DateTimePicker
                        value={selectedDate || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={onDateChange}
                        maximumDate={new Date()}
                    />
                )}
            </LinearGradient>

            <FlatList
                data={sessions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <SessionItem item={item} />}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={refreshHistory}
                        tintColor={Theme.tint}
                        colors={[Theme.tint]}
                    />
                }
                ListEmptyComponent={
                    isHydrating ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>Loading history...</Text>
                        </View>
                    ) : (
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>No Records Found</Text>
                            <Text style={styles.emptyText}>
                                {selectedDate
                                    ? "Try a different date or clear the filter."
                                    : "Your attendance sessions will appear here."}
                            </Text>
                        </View>
                    )
                }
            />
        </View>
    );
}

const createStyles = (Theme: any) =>
    StyleSheet.create({
        page: {
            flex: 1,
            backgroundColor: Theme.background,
        },
        headerBtn: {
            marginRight: 8,
            padding: 8,
            borderRadius: 12,
            backgroundColor: "rgba(225,29,72,0.05)",
        },
        headerBtnPressed: {
            backgroundColor: "rgba(225,29,72,0.15)",
        },
        clearAllBtn: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.12)",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 12,
            gap: 6,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.2)",
        },
        clearAllBtnPressed: {
            opacity: 0.7,
            transform: [{ scale: 0.98 }],
        },
        clearAllText: {
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: "700",
        },
        heroActions: {
            flexDirection: "row",
            alignItems: "center",
            marginTop: 18,
            gap: 10,
        },
        actionBtn: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.12)",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 12,
            gap: 6,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.2)",
        },
        actionBtnActive: {
            backgroundColor: "rgba(255,255,255,0.25)",
            borderColor: "#FFFFFF",
        },
        actionBtnPressed: {
            opacity: 0.7,
            transform: [{ scale: 0.98 }],
        },
        actionText: {
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: "700",
        },
        hero: {
            paddingTop: 56,
            paddingBottom: 24,
            paddingHorizontal: 16,
        },
        heroTitle: {
            color: "#FFFFFF",
            fontSize: 24,
            fontWeight: "900",
            letterSpacing: 0.2,
        },
        headerRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        logo: {
            width: 44,
            height: 44,
            borderRadius: 8,
        },
        heroSub: {
            color: "rgba(255,255,255,0.78)",
            marginTop: 4,
            fontSize: 14,
        },
        heroStats: {
            marginTop: 14,
            flexDirection: "row",
            gap: 10,
        },
        statPill: {
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.10)",
            borderColor: "rgba(255,255,255,0.16)",
            borderWidth: 1,
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
        },
        statValue: {
            color: "#FFFFFF",
            fontSize: 18,
            fontWeight: "800",
        },
        statLabel: {
            color: "rgba(255,255,255,0.72)",
            fontSize: 12,
            marginTop: 2,
        },
        listContent: {
            padding: 16,
            gap: 12,
        },
        sessionCard: {
            backgroundColor: Theme.card,
            borderRadius: 24,
            padding: 16,
            borderWidth: 1,
            borderColor: Theme.border,
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
        },
        cardPressed: {
            transform: [{ scale: 0.98 }],
            backgroundColor: Theme.card === "#FFFFFF" ? Theme.background : "#1A1A1A",
        },
        cardHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
        },
        subjectCode: {
            fontSize: 14,
            fontWeight: "900",
            color: Theme.text,
        },
        dateLabel: {
            fontSize: 11,
            color: Theme.muted,
            marginTop: 2,
            fontWeight: "600",
        },
        deleteBtn: {
            padding: 8,
            borderRadius: 12,
            backgroundColor: "rgba(225,29,72,0.05)",
        },
        deleteBtnPressed: {
            backgroundColor: "rgba(225,29,72,0.15)",
        },
        sessionDetails: {
            marginTop: 8,
            fontSize: 14,
            fontWeight: "700",
            color: Theme.text,
            lineHeight: 20,
        },
        cardFooter: {
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
        },
        countPill: {
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 12,
            backgroundColor: Theme.card === "#FFFFFF" ? "#F5F0EB" : "#1A1A1A",
        },
        countText: {
            fontSize: 11,
            fontWeight: "800",
            color: Theme.text,
        },
        arrowBox: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: Theme.card === "#FFFFFF" ? "#F8FAFC" : "#1F2937",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: Theme.border,
        },
        empty: {
            marginTop: 40,
            padding: 24,
            alignItems: "center",
            backgroundColor: Theme.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: Theme.border,
            borderStyle: "dashed",
        },
        emptyTitle: {
            fontSize: 16,
            fontWeight: "800",
            color: Theme.text,
        },
        emptyText: {
            marginTop: 6,
            fontSize: 13,
            color: Theme.muted,
            textAlign: "center",
        },
    });
