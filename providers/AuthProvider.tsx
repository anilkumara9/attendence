import { trpc } from "@/providers/TrpcProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type Staff = {
  id: string;
  staffId: string;
  name: string;
};

const STORAGE_KEY = "myclass.auth.staff";

type LockoutState = {
  count: number;
  lockedUntilMs: number;
};

export type LoginResult =
  | { ok: true; staff: Staff }
  | { ok: false; message: string; lockedUntilMs?: number };

export type LogoutReason = "manual" | "expired" | "unknown";

const STORAGE_LOCKOUT = "myclass.auth.lockout";
const MAX_FAILED = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const INACTIVITY_MS = 15 * 60 * 1000;

export interface AuthContextValue {
  staff: Staff | null;
  isHydrating: boolean;
  canAccess: boolean;
  logoutReason: LogoutReason | null;
  login: (staffId: string, password: string) => Promise<LoginResult>;
  logout: (reason?: LogoutReason) => Promise<void>;
  register: (staffId: string, password: string, name: string, email: string) => Promise<{ ok: boolean, message?: string }>;
  updatePassword: (newPassword: string) => Promise<{ ok: boolean, message?: string }>;
  notifyActivity: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [logoutReason, setLogoutReason] = useState<LogoutReason | null>(null);

  const lastActiveAtMsRef = useRef<number>(Date.now());
  const staffRef = useRef<Staff | null>(null);

  useEffect(() => {
    staffRef.current = staff;
  }, [staff]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Staff;
          if (parsed?.staffId && parsed?.id) {
            setStaff({ id: parsed.id, staffId: parsed.staffId, name: parsed.name ?? "Staff" });
            lastActiveAtMsRef.current = Date.now();
          }
        }
      } catch (e) {
        console.log("[Auth] hydrate error", e);
      } finally {
        if (mounted) setIsHydrating(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const s = staffRef.current;
      if (!s) return;
      const idleMs = Date.now() - lastActiveAtMsRef.current;
      if (idleMs >= INACTIVITY_MS) {
        console.log("[Auth] inactivity logout", { staffId: s.staffId, idleMs });
        void (async () => {
          try {
            setLogoutReason("expired");
            setStaff(null);
            await AsyncStorage.removeItem(STORAGE_KEY);
          } catch (e) {
            console.log("[Auth] inactivity logout error", e);
          }
        })();
      }
    }, 30_000);

    return () => clearInterval(id);
  }, []);

  const readLockouts = useCallback(async (): Promise<Record<string, LockoutState>> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_LOCKOUT);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, LockoutState>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      console.log("[Auth] read lockouts error", e);
      return {};
    }
  }, []);

  const writeLockouts = useCallback(
    async (lockouts: Record<string, LockoutState>) => {
      try {
        await AsyncStorage.setItem(STORAGE_LOCKOUT, JSON.stringify(lockouts));
      } catch (e) {
        console.log("[Auth] write lockouts error", e);
      }
    },
    []
  );

  const loginMutation = trpc.login.useMutation();
  const registerMutation = trpc.register.useMutation();
  const updatePasswordMutation = trpc.updatePassword.useMutation();

  const login = useCallback(
    async (staffId: string, password: string): Promise<LoginResult> => {
      console.log("[Auth] login attempt", { staffId });
      const normalizedId = staffId.trim();

      const lockouts = await readLockouts();
      const st = lockouts[normalizedId];
      const now = Date.now();

      if (st?.lockedUntilMs && st.lockedUntilMs > now) {
        return {
          ok: false,
          message: "Too many failed attempts. Try again shortly.",
          lockedUntilMs: st.lockedUntilMs,
        };
      }

      try {
        const result = await loginMutation.mutateAsync({ staffId: normalizedId, password });

        if (!result.ok || !result.staff) {
          const prev = st?.lockedUntilMs && st.lockedUntilMs > now ? st : st;
          const nextCount = (prev?.count ?? 0) + 1;

          const nextState: LockoutState =
            nextCount >= MAX_FAILED
              ? { count: nextCount, lockedUntilMs: now + LOCKOUT_MS }
              : { count: nextCount, lockedUntilMs: 0 };

          await writeLockouts({
            ...lockouts,
            [normalizedId]: nextState,
          });

          return {
            ok: false,
            message: result.message ?? "Invalid staff ID or password",
            lockedUntilMs: nextState.lockedUntilMs > 0 ? nextState.lockedUntilMs : undefined,
          };
        }

        await writeLockouts({
          ...lockouts,
          [normalizedId]: { count: 0, lockedUntilMs: 0 },
        });

        const next: Staff = {
          id: result.staff.id,
          staffId: result.staff.staffId,
          name: result.staff.name,
        };
        setLogoutReason(null);
        setStaff(next);
        lastActiveAtMsRef.current = Date.now();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));

        return { ok: true, staff: next };
      } catch (e) {
        console.log("[Auth] login error", e);
        return { ok: false, message: "Network error. Please try again." };
      }
    },
    [loginMutation, readLockouts, writeLockouts]
  );

  const register = useCallback(
    async (staffId: string, password: string, name: string, email: string) => {
      try {
        const result = await registerMutation.mutateAsync({ staffId, password, name, email });
        if (result.ok && result.staff) {
          const next: Staff = {
            id: result.staff.id,
            staffId: result.staff.staffId,
            name: result.staff.name,
          };
          setStaff(next);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return { ok: true };
        }
        return { ok: false, message: result.message };
      } catch (e) {
        return { ok: false, message: "Registration failed" };
      }
    },
    [registerMutation]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      if (!staff) return { ok: false, message: "Not logged in" };
      try {
        const result = await updatePasswordMutation.mutateAsync({ id: staff.id, newPassword });
        return result.ok ? { ok: true } : { ok: false, message: result.message };
      } catch (e) {
        return { ok: false, message: "Update failed" };
      }
    },
    [staff, updatePasswordMutation]
  );

  const logout = useCallback(async (reason: LogoutReason = "manual") => {
    console.log("[Auth] logout", { reason });
    setLogoutReason(reason);
    setStaff(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const notifyActivity = useCallback(() => {
    if (!staffRef.current) return;
    lastActiveAtMsRef.current = Date.now();
  }, []);

  const canAccess = useMemo(() => {
    return !!staff && !isHydrating;
  }, [isHydrating, staff]);

  const value: AuthContextValue = {
    staff,
    isHydrating,
    canAccess,
    logoutReason,
    login,
    logout,
    register,
    updatePassword,
    notifyActivity,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
