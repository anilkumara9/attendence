import { getDatabase, initDatabase } from "@/lib/db";
import { useAuth } from "@/providers/AuthProvider";
import { trpc } from "@/providers/TrpcProvider";
import * as DocumentPicker from "expo-document-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as XLSX from "xlsx";

export type AttendanceStatus = "present" | "absent";

export type StudentRow = {
    regNo: string;
    name: string;
    status?: AttendanceStatus;
};

export type SessionSubject = {
    code: string;
    name: string;
};

export type AttendanceSession = {
    id: string;
    createdAt: string;
    academicYear?: string;
    semesterType?: string;
    semester?: string;
    subject?: SessionSubject;
    section?: string;
    sessionDetails: string;
    students: Required<StudentRow>[];
};

type SaveSessionInput = {
    academicYear?: string;
    semesterType?: string;
    semester?: string;
    subject?: SessionSubject;
    section?: string;
    sessionDetails: string;
    allowDuplicateIfNotSaved?: boolean;
};

const STORAGE_SESSIONS = "myclass.attendance.sessions";

function makeId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeCell(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    return String(value);
}

function parseStudentsFromSheet(rows: unknown[][]): StudentRow[] {
    const out: StudentRow[] = [];

    for (let i = 0; i < rows.length; i += 1) {
        const r = rows[i] ?? [];
        const regRaw = normalizeCell(r[0]);
        const nameRaw = normalizeCell(r[1]);

        if (!regRaw && !nameRaw) continue;

        const reg = regRaw.trim();
        const name = nameRaw.trim();

        if (!reg || !name) continue;

        const maybeHeader =
            i === 0 &&
            (reg.toLowerCase().includes("reg") ||
                name.toLowerCase().includes("name"));

        if (maybeHeader) continue;

        out.push({ regNo: reg, name });
    }

    const seen = new Set<string>();
    const deduped: StudentRow[] = [];
    for (const s of out) {
        if (seen.has(s.regNo)) continue;
        seen.add(s.regNo);
        deduped.push(s);
    }

    return deduped;
}


export interface AttendanceContextValue {
    students: StudentRow[];
    setStudents: React.Dispatch<React.SetStateAction<StudentRow[]>>;
    sessions: AttendanceSession[];
    isHydrating: boolean;
    isImporting: boolean;
    isSaving: boolean;
    importFromExcel: () => Promise<void>;
    saveSession: (input: SaveSessionInput) => Promise<AttendanceSession>;
    getSessionById: (sessionId: string) => AttendanceSession | undefined;
    exportSessionPdf: (sessionOrId: string | AttendanceSession) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    deleteAllSessions: () => Promise<void>;
    resetStudents: () => void;
    selectedDate: Date | null;
    setSelectedDate: (date: Date | null) => void;
    refreshHistory: () => Promise<void>;
    isRefreshing: boolean;
    stats: { totalSessions: number; totalStudents: number };
}

const AttendanceContext = createContext<AttendanceContextValue | undefined>(undefined);

export function useAttendance() {
    const context = useContext(AttendanceContext);
    if (!context) throw new Error("useAttendance must be used within AttendanceProvider");
    return context;
}

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
    const { staff } = useAuth();
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [isHydrating, setIsHydrating] = useState<boolean>(true);
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const saveSessionMutation = trpc.saveSession.useMutation();
    const deleteSessionMutation = trpc.deleteSession.useMutation();
    const deleteAllSessionsMutation = trpc.deleteAllSessions.useMutation();
    const getSessionsQuery = trpc.getSessions.useQuery(
        {
            markedBy: staff?.id,
            startDate: selectedDate ? new Date(new Date(selectedDate).setHours(0, 0, 0, 0)).toISOString() : undefined,
            endDate: selectedDate ? new Date(new Date(selectedDate).setHours(23, 59, 59, 999)).toISOString() : undefined
        },
        { enabled: !!staff?.id }
    );

    const refreshHistory = useCallback(async () => {
        if (!staff?.id) return;
        setIsRefreshing(true);
        try {
            await getSessionsQuery.refetch();
        } catch (e) {
            console.log("[Attendance] refresh error", e);
        } finally {
            setIsRefreshing(false);
        }
    }, [staff?.id, getSessionsQuery]);

    useEffect(() => {
        let mounted = true;
        // Reset state and show loading whenever filter/user changes
        setIsHydrating(true);
        setSessions([]);

        const run = async () => {
            try {
                await initDatabase();
                const db = await getDatabase();
                const rows = await db.getAllAsync<{
                    id: string;
                    createdAt: string;
                    academicYear: string;
                    semesterType: string;
                    semester: string;
                    subjectCode: string;
                    subjectName: string;
                    section: string;
                    sessionDetails: string;
                    students: string;
                }>(`
                    SELECT id, academicYear, semesterType, semester, subjectCode, subjectName, section, sessionDetails, students, 
                           datetime(localCreatedTime/1000, 'unixepoch') as createdAt 
                    FROM LocalAttendance 
                    WHERE markedBy = ?
                      AND (? IS NULL OR date(localCreatedTime/1000, 'unixepoch', 'localtime') = ?)
                    ORDER BY localCreatedTime DESC
                `, [
                    staff?.id || "",
                    selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : null,
                    selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : null
                ]);

                if (!mounted) return;

                const localSessions: AttendanceSession[] = rows.map(r => ({
                    id: r.id,
                    createdAt: r.createdAt,
                    academicYear: r.academicYear,
                    semesterType: r.semesterType,
                    semester: r.semester,
                    subject: (r.subjectCode || r.subjectName) ? { code: r.subjectCode, name: r.subjectName } : undefined,
                    section: r.section,
                    sessionDetails: r.sessionDetails || "",
                    students: JSON.parse(r.students),
                }));

                setSessions(localSessions);
            } catch (e) {
                console.error("[Attendance] hydrate error", e);
            } finally {
                if (mounted) setIsHydrating(false);
            }
        };

        void run();
        return () => {
            mounted = false;
        };
    }, [staff?.id, selectedDate]);

    // Sync from cloud when online
    useEffect(() => {
        if (getSessionsQuery.data) {
            setSessions(prev => {
                const cloudSessions: AttendanceSession[] = (getSessionsQuery.data ?? []).map(s => ({
                    id: s.id,
                    createdAt: s.createdAt,
                    academicYear: s.academicYear,
                    semesterType: s.semesterType,
                    semester: s.semester,
                    subject: s.subject,
                    students: s.students.map(st => ({
                        regNo: st.regNo,
                        name: st.studentName,
                        status: st.status
                    })),
                    section: s.section,
                    sessionDetails: s.sessionDetails
                }));
                const cloudIds = new Set(cloudSessions.map(s => s.id));
                const filteredLocal = prev.filter(s => !cloudIds.has(s.id));
                return [...cloudSessions, ...filteredLocal];
            });
        }
    }, [getSessionsQuery.data]);

    const syncUnsyncedRecords = useCallback(async () => {
        if (!staff) return;
        try {
            const db = await getDatabase();
            const unsynced = await db.getAllAsync<{
                id: string;
                academicYear: string;
                semesterType: string;
                semester: string;
                subjectCode: string;
                subjectName: string;
                section: string;
                sessionDetails: string;
                students: string;
            }>(`SELECT * FROM LocalAttendance WHERE isSynced = 0 AND markedBy = ?`, [staff.id]);

            for (const rec of unsynced) {
                try {
                    const result = await saveSessionMutation.mutateAsync({
                        academicYear: rec.academicYear || undefined,
                        semesterType: rec.semesterType || undefined,
                        semester: rec.semester || undefined,
                        subject: (rec.subjectCode || rec.subjectName) ? {
                            code: rec.subjectCode || "",
                            name: rec.subjectName || ""
                        } : undefined,
                        section: rec.section || undefined,
                        sessionDetails: rec.sessionDetails || "",
                        students: JSON.parse(rec.students).map((s: any) => ({
                            regNo: s.regNo,
                            studentName: s.name,
                            status: s.status,
                        })),
                        markedBy: staff.id,
                    });

                    if (result.ok && result.sessionId) {
                        // Update local ID to match remote ID to prevent dupes
                        await db.runAsync(`UPDATE LocalAttendance SET id = ?, isSynced = 1 WHERE id = ?`, [result.sessionId, rec.id]);

                        // Update state ID as well
                        setSessions(prev => prev.map(s => s.id === rec.id ? { ...s, id: result.sessionId } : s));

                        console.log("[Attendance] synced record", rec.id, "->", result.sessionId);
                    }
                } catch (err) {
                    console.log("[Attendance] sync record error", rec.id, err);
                }
            }
        } catch (e) {
            console.log("[Attendance] syncUnsyncedRecords error", e);
        }
    }, [saveSessionMutation, staff]);

    const resetStudents = useCallback(() => {
        setStudents([]);
        setIsImporting(false);
    }, []);

    const persistSessions = useCallback(async (next: AttendanceSession[]) => {
        // Local persistence is now handled directly in saveSession via SQLite
    }, []);

    const importFromExcel = useCallback(async () => {
        setIsImporting(true);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled) {
                console.log("[Attendance] import canceled");
                return;
            }

            const asset = result.assets?.[0];
            if (!asset?.uri) {
                throw new Error("No document URI");
            }

            console.log("[Attendance] importing file", {
                name: asset.name,
                size: asset.size,
                uri: asset.uri,
            });

            const base64 = await new Promise<string>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        const res = reader.result as string;
                        resolve(res.split(",")[1] ?? "");
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(xhr.response);
                };
                xhr.onerror = function (e) {
                    console.error("[Attendance] XHR error", e);
                    reject(new Error("Failed to read file"));
                };
                xhr.responseType = "blob";
                xhr.open("GET", asset.uri, true);
                xhr.send();
            });

            console.log("[Attendance] file read success, base64 length:", base64.length);

            const wb = XLSX.read(base64, { type: "base64" });
            const sheetName = wb.SheetNames[0];
            const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
            if (!sheet) throw new Error("No sheets found");

            const rows = XLSX.utils.sheet_to_json(sheet, {
                header: 1,
                raw: false,
            }) as unknown[][];

            const parsed = parseStudentsFromSheet(rows);
            console.log("[Attendance] parsed students", { count: parsed.length });

            setStudents(parsed);
        } finally {
            setIsImporting(false);
        }
    }, []);

    const saveSession = useCallback(
        async (input: SaveSessionInput): Promise<AttendanceSession> => {
            if (!staff) throw new Error("Not authenticated");
            setIsSaving(true);
            try {
                const nowIso = new Date().toISOString();
                const nowMs = Date.now();
                const snapshot: Required<StudentRow>[] = students
                    .filter((s) => !!s.regNo && !!s.name)
                    .map((s) => ({
                        regNo: s.regNo,
                        name: s.name,
                        status: s.status ?? "absent",
                    }));

                if (!snapshot.length) {
                    throw new Error("No students to save");
                }

                const sessionId = makeId();
                const session: AttendanceSession = {
                    id: sessionId,
                    createdAt: nowIso,
                    academicYear: input.academicYear,
                    semesterType: input.semesterType,
                    semester: input.semester,
                    subject: input.subject,
                    section: input.section,
                    sessionDetails: input.sessionDetails,
                    students: snapshot,
                };

                // 1. Save to SQLite
                const db = await getDatabase();
                await db.runAsync(
                    `INSERT INTO LocalAttendance (id, academicYear, semesterType, semester, subjectCode, subjectName, section, sessionDetails, students, markedBy, isSynced, isOfflineCreated, localCreatedTime) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        sessionId,
                        input.academicYear ?? null,
                        input.semesterType ?? null,
                        input.semester ?? null,
                        input.subject?.code ?? null,
                        input.subject?.name ?? null,
                        input.section ?? null,
                        input.sessionDetails,
                        JSON.stringify(snapshot),
                        staff.id,
                        0, // isSynced
                        1, // isOfflineCreated
                        nowMs
                    ]
                );

                setSessions(prev => [session, ...prev]);

                if (snapshot.length === 0) throw new Error("No students to save");

                // 2. Attempt sync to MongoDB
                let finalSessionId = sessionId;
                try {
                    const result = await saveSessionMutation.mutateAsync({
                        academicYear: input.academicYear,
                        semesterType: input.semesterType,
                        semester: input.semester,
                        subject: input.subject,
                        section: input.section,
                        sessionDetails: input.sessionDetails,
                        students: snapshot.map(s => ({
                            regNo: s.regNo,
                            studentName: s.name,
                            status: s.status as "present" | "absent"
                        })),
                        markedBy: staff.id,
                    });

                    if (result.ok && result.sessionId) {
                        finalSessionId = result.sessionId;
                        // Update local ID to match remote ID so we don't get duplicates
                        await db.runAsync(`UPDATE LocalAttendance SET id = ?, isSynced = 1 WHERE id = ?`, [finalSessionId, sessionId]);

                        // Update the session in state with new ID
                        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, id: finalSessionId } : s));

                        console.log("[Attendance] synced immediately", sessionId, "->", finalSessionId);
                    }
                } catch (e) {
                    console.log("[Attendance] direct sync failed (expected if offline)", e);
                }

                return { ...session, id: finalSessionId };
            } catch (err: any) {
                console.error("[Attendance] saveSession error:", err.message, err.stack);
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [staff, students, saveSessionMutation]
    );

    const getSessionById = useCallback(
        (sessionId: string): AttendanceSession | undefined => {
            return sessions.find((s) => s.id === sessionId);
        },
        [sessions]
    );

    const exportSessionPdf = useCallback(
        async (sessionOrId: string | AttendanceSession) => {
            let session: AttendanceSession | undefined;
            if (typeof sessionOrId === "string") {
                session = getSessionById(sessionOrId);
            } else {
                session = sessionOrId;
            }

            if (!session) throw new Error("Session not found");

            const presentCount = session.students.reduce((acc, s) => {
                return acc + (s.status === "present" ? 1 : 0);
            }, 0);

            const html = `
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 18px; color: #0B1220; }
      .title { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
      .meta { color: #667085; font-size: 12px; margin-bottom: 14px; }
      .pill { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #F2F4F7; margin-right: 8px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #E6E8EF; padding: 8px; font-size: 12px; }
      th { background: #F8FAFC; text-align: left; }
      .statusP { font-weight: 800; color: #12B76A; }
      .statusA { font-weight: 800; color: #E11D48; }
    </style>
  </head>
  <body>
    <div class="title">MyClass Attendance Report</div>
    <div class="meta">
      Details: ${escapeHtml(session.sessionDetails)}<br />
      Created: ${escapeHtml(new Date(session.createdAt).toLocaleString())}
    </div>

    <div>
      <span class="pill">Students: ${session.students.length}</span>
      <span class="pill">Present: ${presentCount}</span>
      <span class="pill">Absent: ${session.students.length - presentCount}</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Registration No</th>
          <th>Name</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${session.students
                    .map((s, idx) => {
                        const cls = s.status === "present" ? "statusP" : "statusA";
                        const label = s.status === "present" ? "Present" : "Absent";
                        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(s.regNo)}</td>
            <td>${escapeHtml(s.name)}</td>
            <td class="${cls}">${label}</td>
          </tr>`;
                    })
                    .join("\n")}
      </tbody>
    </table>
  </body>
</html>`;

            console.log("[Attendance] exporting PDF", { platform: Platform.OS, sessionId: session.id });

            if (Platform.OS === "web") {
                await Print.printAsync({ html });
                return;
            }

            const file = await Print.printToFileAsync({ html, base64: false });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(file.uri, {
                    mimeType: "application/pdf",
                    dialogTitle: "Share attendance report",
                    UTI: "com.adobe.pdf",
                });
            }
        },
        [getSessionById]
    );

    const deleteSession = useCallback(
        async (sessionId: string) => {
            try {
                // 1. Delete from local SQLite
                const db = await getDatabase();
                await db.runAsync(`DELETE FROM LocalAttendance WHERE id = ?`, [sessionId]);

                // 2. Remove from local state
                setSessions((prev) => prev.filter((s) => s.id !== sessionId));

                // 3. Delete from MongoDB (if synced)
                // We attempt it regardless, if it's a local-only ID it will just fail/do nothing on backend
                await deleteSessionMutation.mutateAsync({ id: sessionId });

                console.log("[Attendance] session deleted permanently", sessionId);
            } catch (e) {
                console.error("[Attendance] deleteSession error", e);
            }
        },
        [deleteSessionMutation]
    );

    const deleteAllSessions = useCallback(
        async () => {
            if (!staff) return;
            try {
                // 1. Delete from local SQLite
                const db = await getDatabase();
                await db.runAsync(`DELETE FROM LocalAttendance WHERE markedBy = ?`, [staff.id]);

                // 2. Remove from local state
                setSessions([]);

                // 3. Delete from MongoDB
                await deleteAllSessionsMutation.mutateAsync({ markedBy: staff.id });

                console.log("[Attendance] all sessions cleared");
            } catch (e) {
                console.error("[Attendance] deleteAllSessions error", e);
            }
        },
        [deleteAllSessionsMutation, staff]
    );

    const stats = useMemo(() => {
        const totalSessions = sessions.length;
        const totalStudents = sessions.reduce((acc, s) => acc + s.students.length, 0);
        return { totalSessions, totalStudents };
    }, [sessions]);

    const value: AttendanceContextValue = {
        students,
        setStudents,
        sessions,
        isHydrating,
        isImporting,
        isSaving,
        importFromExcel,
        saveSession,
        getSessionById,
        exportSessionPdf,
        deleteSession,
        deleteAllSessions,
        resetStudents,
        selectedDate,
        setSelectedDate,
        refreshHistory,
        isRefreshing,
        stats,
    };

    return (
        <AttendanceContext.Provider value={value}>
            {children}
        </AttendanceContext.Provider>
    );
}
