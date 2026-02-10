import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { RefreshCw, Share2 } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
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
import {
  AttendanceStatus,
  useAttendance,
  type StudentRow,
} from "@/providers/AttendanceProvider";
import { useAuth } from "@/providers/AuthProvider";

export default function AttendanceScreen() {
  const { notifyActivity } = useAuth();
  const Theme = useThemeColor();
  const styles = useMemo(() => createStyles(Theme), [Theme]);
  const {
    students,
    setStudents,
    importFromExcel,
    saveSession,
    exportSessionPdf,
    isImporting,
    isSaving,
    resetStudents,
  } = useAttendance();

  const [academicYear, setAcademicYear] = useState<string>("");
  const [semesterType, setSemesterType] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [filter, setFilter] = useState<string>("");

  const setStatus = useCallback(
    (regNo: string, status: AttendanceStatus) => {
      setStudents((prev: StudentRow[]) =>
        prev.map((s: StudentRow) => (s.regNo === regNo ? { ...s, status } : s))
      );
      if (Platform.OS !== "web") {
        void Haptics.selectionAsync();
      }
    },
    [setStudents]
  );

  const filteredStudents = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s: StudentRow) => {
      const a = `${s.regNo} ${s.name}`.toLowerCase();
      return a.includes(q);
    });
  }, [filter, students]);

  const resetContext = useCallback(() => {
    setAcademicYear("");
    setSemesterType("");
    setSemester("");
    setSection("");
    setSubject("");
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const presentCount = useMemo(() => {
    return students.reduce((acc: number, s: StudentRow) => {
      return acc + (s.status === "present" ? 1 : 0);
    }, 0);
  }, [students]);

  const absentCount = useMemo(() => {
    return students.reduce((acc: number, s: StudentRow) => {
      return acc + (s.status === "absent" ? 1 : 0);
    }, 0);
  }, [students]);

  const markAll = useCallback(
    (status: AttendanceStatus) => {
      setStudents((prev: StudentRow[]) =>
        prev.map((s: StudentRow) => ({ ...s, status }))
      );
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          status === "present"
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
        );
      }
    },
    [setStudents]
  );

  const onImport = useCallback(async () => {
    notifyActivity();
    try {
      await importFromExcel();
    } catch (e) {
      console.log("[Attendance] import error", e);
      Alert.alert(
        "Import failed",
        "Couldn't read that file. Please upload an Excel file with Registration No and Name in the first two columns."
      );
    }
  }, [importFromExcel, notifyActivity]);

  const onSave = useCallback(async () => {
    notifyActivity();
    if (!students.length) {
      Alert.alert("No students", "Import a student list first.");
      return;
    }
    const hasUnmarked = students.some((s: StudentRow) => !s.status);
    if (hasUnmarked) {
      Alert.alert(
        "Unmarked students",
        "Some students are not marked yet. Do you want to mark all as Present?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark all Present",
            onPress: () => markAll("present"),
          },
        ]
      );
      return;
    }

    const combinedDetails = `${academicYear} • ${semesterType} • Sem ${semester} ${section ? `• Sec ${section} ` : ""}• ${subject}`;
    if (!academicYear.trim() || !semester.trim() || !subject.trim() || !semesterType.trim()) {
      Alert.alert("Missing Details", "Please fill in Year, Semester Type, Semester, and Subject.");
      return;
    }

    try {
      const session = await saveSession({
        academicYear,
        semesterType,
        semester,
        section,
        subject: subject ? { code: subject, name: "" } : undefined,
        sessionDetails: combinedDetails,
      });
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Saved", "Attendance saved successfully.", [
        {
          text: "View",
          onPress: () =>
            router.push({
              pathname: "/session/[sessionId]",
              params: { sessionId: session.id },
            }),
        },
        { text: "OK" },
      ]);
    } catch (e: any) {
      console.error("[Attendance] save error:", e.message, e);
      Alert.alert("Save failed", e.message || "Please try again.");
    }
  }, [
    markAll,
    notifyActivity,
    saveSession,
    academicYear,
    semesterType,
    semester,
    section,
    subject,
    students,
  ]);

  const onExport = useCallback(async () => {
    notifyActivity();
    const combinedDetails = `${academicYear} • ${semesterType} • Sem ${semester} ${section ? `• Sec ${section} ` : ""}• ${subject}`;
    if (!academicYear.trim() || !semester.trim() || !subject.trim() || !semesterType.trim()) {
      Alert.alert("Missing Details", "Please fill in Year, Semester Type, Semester, and Subject.");
      return;
    }
    try {
      const session = await saveSession({
        academicYear,
        semesterType,
        semester,
        section,
        subject: subject ? { code: subject, name: "" } : undefined,
        sessionDetails: combinedDetails,
        allowDuplicateIfNotSaved: true,
      });
      await exportSessionPdf(session);
    } catch (e: any) {
      console.error("[Attendance] export error:", e.message, e);
      Alert.alert("Export failed", e.message || "Please try again.");
    }
  }, [
    exportSessionPdf,
    notifyActivity,
    saveSession,
    academicYear,
    semesterType,
    semester,
    section,
    subject,
  ]);



  const StudentRowItem = useCallback(
    ({ row }: { row: StudentRow }) => {
      const pActive = row.status === "present";
      const aActive = row.status === "absent";
      return (
        <View style={styles.studentRow} testID={`student-row-${row.regNo}`}>
          <View style={styles.studentMeta}>
            <Text style={styles.studentName} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={styles.studentReg} numberOfLines={1}>
              {row.regNo}
            </Text>
          </View>
          <View style={styles.studentActions}>
            <Pressable
              testID={`mark-present-${row.regNo}`}
              onPress={() => setStatus(row.regNo, "present")}
              style={({ pressed }) => [
                styles.pill,
                pActive ? styles.pillPresent : styles.pillNeutral,
                pressed && styles.pillPressed,
              ]}
            >
              <Text style={[styles.pillText, pActive && styles.pillTextOn]}>
                P
              </Text>
            </Pressable>
            <Pressable
              testID={`mark-absent-${row.regNo}`}
              onPress={() => setStatus(row.regNo, "absent")}
              style={({ pressed }) => [
                styles.pill,
                aActive ? styles.pillAbsent : styles.pillNeutral,
                pressed && styles.pillPressed,
              ]}
            >
              <Text style={[styles.pillText, aActive && styles.pillTextOn]}>
                A
              </Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [setStatus]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.page}
      testID="attendance-screen"
    >
      <Stack.Screen options={{ headerShown: false }} />

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
          <Text style={styles.heroTitle}>Take Attendance</Text>
        </View>
        <Text style={styles.heroSub}>
          Quick attendance with offline-safe sessions
        </Text>

        <View style={styles.heroStats}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{students.length}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{absentCount}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Session Context</Text>
            <Pressable
              onPress={resetContext}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.iconBtnPressed,
              ]}
            >
              <RefreshCw size={18} color={Theme.muted} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Academic Year</Text>
          <View style={[styles.chatInputWrap, { minHeight: 44 }]}>
            <TextInput
              testID="academic-year"
              value={academicYear}
              onChangeText={setAcademicYear}
              placeholder="e.g. 2024-25"
              placeholderTextColor={"#98A2B3"}
              style={styles.chatInputSmall}
            />
          </View>

          <Text style={[styles.fieldLabel, styles.mt12]}>Semester Type</Text>
          <View style={[styles.chatInputWrap, { minHeight: 44 }]}>
            <TextInput
              testID="semester-type"
              value={semesterType}
              onChangeText={setSemesterType}
              placeholder="e.g. Odd Semester"
              placeholderTextColor={"#98A2B3"}
              style={styles.chatInputSmall}
            />
          </View>

          <Text style={[styles.fieldLabel, styles.mt12]}>Semester</Text>
          <View style={[styles.chatInputWrap, { minHeight: 44 }]}>
            <TextInput
              testID="semester"
              value={semester}
              onChangeText={setSemester}
              placeholder="e.g. 3rd Sem"
              placeholderTextColor={"#98A2B3"}
              style={styles.chatInputSmall}
            />
          </View>

          <Text style={[styles.fieldLabel, styles.mt12]}>Section (Optional)</Text>
          <View style={[styles.chatInputWrap, { minHeight: 44 }]}>
            <TextInput
              testID="section"
              value={section}
              onChangeText={setSection}
              placeholder="e.g. Sec A"
              placeholderTextColor={"#98A2B3"}
              style={styles.chatInputSmall}
            />
          </View>

          <Text style={[styles.fieldLabel, styles.mt12]}>Subject</Text>
          <View style={[styles.chatInputWrap, { minHeight: 44 }]}>
            <TextInput
              testID="subject"
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Cyber Security"
              placeholderTextColor={"#98A2B3"}
              style={styles.chatInputSmall}
              multiline
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Student List</Text>

          <View style={styles.actionsRow}>
            <Pressable
              testID="import-excel"
              onPress={students.length > 0 ? resetStudents : onImport}
              disabled={isImporting}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
                { backgroundColor: students.length > 0 ? Theme.muted : Theme.tint }, // Grey if Reset, Tint if Import
                isImporting && styles.btnDisabled,
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {isImporting ? "Importing…" : (students.length > 0 ? "Reset List" : "Import Excel")}
              </Text>
            </Pressable>

            <Pressable
              testID="mark-all-present"
              onPress={() => markAll("present")}
              disabled={!students.length}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
                !students.length && styles.btnDisabled,
              ]}
            >
              <Text style={styles.secondaryBtnText}>All P</Text>
            </Pressable>

            <Pressable
              testID="mark-all-absent"
              onPress={() => markAll("absent")}
              disabled={!students.length}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
                !students.length && styles.btnDisabled,
              ]}
            >
              <Text style={styles.secondaryBtnText}>All A</Text>
            </Pressable>
          </View>

          {students.length > 0 && (
            <View style={styles.searchWrap}>
              <TextInput
                testID="student-search"
                value={filter}
                onChangeText={setFilter}
                placeholder="Search name or reg no"
                placeholderTextColor={"#98A2B3"}
                style={styles.search}
              />
            </View>
          )}

          {!students.length ? (
            <View style={styles.empty} testID="empty-state">
              <Text style={styles.emptyTitle}>Upload your class list</Text>
              <Text style={styles.emptyText}>
                Excel format: Column A = Registration Number, Column B = Student Name
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredStudents.map((row: StudentRow) => (
                <StudentRowItem key={row.regNo} row={row} />
              ))}
            </View>
          )}

          {students.length > 0 && (
            <View style={styles.footerActions}>
              <Pressable
                testID="save-attendance"
                onPress={onSave}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && styles.saveBtnPressed,
                  isSaving && styles.btnDisabled,
                ]}
              >
                <Text style={styles.saveBtnText}>
                  {isSaving ? "Saving…" : "Save Session"}
                </Text>
              </Pressable>

              <Pressable
                testID="export-pdf"
                onPress={onExport}
                style={({ pressed }) => [
                  styles.exportBtn,
                  pressed && styles.exportBtnPressed,
                ]}
              >
                <Share2 size={16} color={Theme.text} />
                <Text style={styles.exportBtnText}>Share Report</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
    content: {
      padding: 16,
      gap: 12,
    },
    chatInputWrap: {
      backgroundColor: Theme.card === "#FFFFFF" ? "#F9FAFB" : "#1A1A1A",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Theme.border,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    chatInputSmall: {
      fontSize: 15,
      fontWeight: "600",
      color: Theme.text,
      paddingVertical: 4,
    },
    chatInput: {
      fontSize: 15,
      fontWeight: "600",
      color: Theme.text,
      minHeight: 60,
      textAlignVertical: "top",
    },
    card: {
      backgroundColor: Theme.card,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: Theme.border,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: Theme.text,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    iconBtn: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: Theme.card === "#FFFFFF" ? "#F2F4F7" : "#1A1A1A",
    },
    iconBtnPressed: {
      transform: [{ scale: 0.96 }],
      opacity: 0.8,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: Theme.muted,
      marginBottom: 8,
    },
    mt12: {
      marginTop: 12,
    },
    rowWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
    },
    chipInactive: {
      backgroundColor: Theme.card === "#FFFFFF" ? "#F2F4F7" : "#1F2937",
      borderColor: Theme.border,
    },
    chipActive: {
      backgroundColor: "rgba(255,122,0,0.12)",
      borderColor: "rgba(255,122,0,0.35)",
    },
    chipPressed: {
      transform: [{ scale: 0.98 }],
    },
    chipText: {
      fontSize: 12,
      fontWeight: "700",
      color: Theme.text,
    },
    chipTextActive: {
      color: Theme.tint,
    },
    subjectHint: {
      marginTop: 8,
      color: Theme.muted,
      fontSize: 12,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: Theme.tint,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryBtnPressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.96,
    },
    primaryBtnText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
    secondaryBtn: {
      width: 62,
      backgroundColor: Theme.card === "#FFFFFF" ? "#F5F0EB" : "#1A1A1A",
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: Theme.border,
    },
    secondaryBtnPressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.96,
    },
    secondaryBtnText: {
      color: Theme.text,
      fontSize: 13,
      fontWeight: "900",
    },
    btnDisabled: {
      opacity: 0.55,
    },
    searchWrap: {
      marginTop: 12,
      backgroundColor: Theme.card === "#FFFFFF" ? "#F5F0EB" : "#1A1A1A",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: Theme.border,
      paddingHorizontal: 12,
    },
    search: {
      height: 44,
      color: Theme.text,
      fontSize: 14,
    },
    empty: {
      marginTop: 14,
      paddingVertical: 24,
      paddingHorizontal: 20,
      borderRadius: 24,
      backgroundColor: Theme.card === "#FFFFFF" ? "#FDFCFB" : "#0A0A0A",
      borderWidth: 1,
      borderColor: Theme.border,
    },
    emptyTitle: {
      color: Theme.text,
      fontSize: 14,
      fontWeight: "800",
    },
    emptyText: {
      marginTop: 6,
      color: Theme.muted,
      fontSize: 12,
      lineHeight: 16,
    },
    list: {
      marginTop: 12,
      gap: 10,
    },
    studentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Theme.border,
      backgroundColor: Theme.card,
    },
    studentMeta: {
      flex: 1,
      paddingRight: 10,
    },
    studentName: {
      color: Theme.text,
      fontSize: 14,
      fontWeight: "800",
    },
    studentReg: {
      marginTop: 3,
      color: Theme.muted,
      fontSize: 12,
      fontWeight: "600",
    },
    studentActions: {
      flexDirection: "row",
      gap: 8,
    },
    pill: {
      width: 44,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
    },
    pillNeutral: {
      backgroundColor: Theme.card === "#FFFFFF" ? "#F2F4F7" : "#1F2937",
      borderColor: Theme.border,
    },
    pillPresent: {
      backgroundColor: "rgba(18,183,106,0.14)",
      borderColor: "rgba(18,183,106,0.34)",
    },
    pillAbsent: {
      backgroundColor: "rgba(225,29,72,0.12)",
      borderColor: "rgba(225,29,72,0.32)",
    },
    pillPressed: {
      transform: [{ scale: 0.98 }],
    },
    pillText: {
      color: Theme.text,
      fontSize: 14,
      fontWeight: "900",
    },
    pillTextOn: {
      color: Theme.text,
    },
    footerActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 14,
    },
    saveBtn: {
      flex: 1,
      backgroundColor: Theme.card === "#FFFFFF" ? "#FF7A00" : "#CC6200",
      borderRadius: 20,
      paddingVertical: 14,
      alignItems: "center",
    },
    saveBtnPressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.96,
    },
    saveBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
    },
    exportBtn: {
      width: 140,
      backgroundColor: Theme.card,
      borderRadius: 20,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      borderWidth: 1,
      borderColor: Theme.border,
    },
    exportBtnPressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.96,
    },
    exportBtnText: {
      color: Theme.text,
      fontSize: 13,
      fontWeight: "900",
    },
  });
