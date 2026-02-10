import { Stack, useLocalSearchParams } from "expo-router";
import { Share } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useAttendance } from "@/providers/AttendanceProvider";
import { useAuth } from "@/providers/AuthProvider";

export default function SessionDetailsModal() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { getSessionById, exportSessionPdf } = useAttendance();
  const { notifyActivity } = useAuth();
  const Theme = useThemeColor();

  const session = useMemo(() => {
    return sessionId ? getSessionById(sessionId) : undefined;
  }, [getSessionById, sessionId]);

  const presentCount = useMemo(() => {
    return (
      session?.students.reduce((acc, s) => acc + (s.status === "present" ? 1 : 0), 0) ??
      0
    );
  }, [session?.students]);

  const onExport = useCallback(async () => {
    if (!sessionId) return;
    try {
      notifyActivity();
      await exportSessionPdf(sessionId);
    } catch (e) {
      console.log("[SessionDetails] export error", e);
      Alert.alert("Export failed", "Please try again.");
    }
  }, [exportSessionPdf, notifyActivity, sessionId]);

  if (!session) {
    return (
      <View style={styles.page} testID="session-missing">
        <Stack.Screen options={{ title: "Session" }} />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Session not found</Text>
          <Text style={styles.emptyText}>It may have been deleted.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page} testID="session-details">
      <Stack.Screen
        options={{
          title: session.subject?.code || "Session Details",
          headerRight: () => (
            <Pressable
              testID="session-export"
              onPress={onExport}
              style={({ pressed }) => [
                styles.headerBtn,
                pressed && styles.headerBtnPressed,
              ]}
            >
              <Share size={20} color={Theme.text} />
              <Text style={styles.headerBtnText}>Share</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{session.subject?.name || "Attendance Session"}</Text>
          <Text style={styles.meta}>
            {session.academicYear} • {session.semesterType} • Sem {session.semester}
            {session.section ? ` • Sec ${session.section}` : ""}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{session.students.length}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{presentCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{session.students.length - presentCount}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
          </View>
        </View>

        <View style={styles.listCard}>
          {session.students.map((s) => (
            <View
              key={s.regNo}
              style={styles.row}
              testID={`session-student-${s.regNo}`}
            >
              <View style={styles.rowMeta}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.rowReg}>{s.regNo}</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  s.status === "present" ? styles.statusPresent : styles.statusAbsent,
                ]}
              >
                <Text style={styles.statusText}>
                  {s.status === "present" ? "Present" : "Absent"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  headerBtnText: {
    color: Colors.light.text,
    fontWeight: "800",
    fontSize: 13,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  title: {
    color: Colors.light.text,
    fontWeight: "900",
    fontSize: 16,
  },
  meta: {
    marginTop: 6,
    color: Colors.light.muted,
    fontWeight: "600",
    fontSize: 12,
  },
  statsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  stat: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statValue: {
    color: Colors.light.text,
    fontWeight: "900",
    fontSize: 16,
  },
  statLabel: {
    marginTop: 2,
    color: Colors.light.muted,
    fontWeight: "700",
    fontSize: 11,
  },
  listCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  rowMeta: {
    flex: 1,
    paddingRight: 10,
  },
  rowName: {
    color: Colors.light.text,
    fontWeight: "900",
    fontSize: 13,
  },
  rowReg: {
    marginTop: 2,
    color: Colors.light.muted,
    fontWeight: "700",
    fontSize: 11,
  },
  statusPill: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  statusPresent: {
    backgroundColor: "rgba(18,183,106,0.12)",
    borderColor: "rgba(18,183,106,0.30)",
  },
  statusAbsent: {
    backgroundColor: "rgba(225,29,72,0.10)",
    borderColor: "rgba(225,29,72,0.26)",
  },
  statusText: {
    color: Colors.light.text,
    fontWeight: "900",
    fontSize: 12,
  },
  empty: {
    margin: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  emptyTitle: {
    color: Colors.light.text,
    fontWeight: "900",
    fontSize: 14,
  },
  emptyText: {
    marginTop: 6,
    color: Colors.light.muted,
    fontWeight: "600",
    fontSize: 12,
  },
});
