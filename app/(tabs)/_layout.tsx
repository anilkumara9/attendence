import { Redirect, Tabs } from "expo-router";
import { ClipboardCheck, History, User } from "lucide-react-native";
import React, { useCallback } from "react";

import { useThemeColor } from "@/hooks/useThemeColor";
import { useAuth } from "@/providers/AuthProvider";

function AuthGate({ children }: { children: React.ReactNode }) {
    const { staff, notifyActivity } = useAuth();

    React.useEffect(() => {
        if (staff) notifyActivity();
    }, [notifyActivity, staff]);
    if (!staff) return <Redirect href="/login" />;
    return <>{children}</>;
}

export default function TabLayout() {
    const { notifyActivity } = useAuth();
    const Theme = useThemeColor();

    const onTabPress = useCallback(() => {
        notifyActivity();
    }, [notifyActivity]);

    return (
        <AuthGate>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: Theme.tint,
                    tabBarInactiveTintColor: Theme.tabIconDefault,
                    headerShown: true,
                    tabBarStyle: {
                        borderTopColor: Theme.border,
                        backgroundColor: Theme.card,
                    },
                    headerStyle: {
                        backgroundColor: Theme.card,
                    },
                    headerTitleStyle: {
                        color: Theme.text,
                        fontWeight: "700",
                    },
                }}
            >
                <Tabs.Screen
                    name="index"
                    listeners={{
                        tabPress: () => onTabPress(),
                    }}
                    options={{
                        headerShown: false,
                        title: "Take Attendance",
                        tabBarLabel: "Attendance",
                        tabBarIcon: ({ color, size }) => (
                            <ClipboardCheck color={color} size={size} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="history"
                    listeners={{
                        tabPress: () => onTabPress(),
                    }}
                    options={{
                        headerShown: false,
                        title: "History",
                        tabBarLabel: "History",
                        tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    listeners={{
                        tabPress: () => onTabPress(),
                    }}
                    options={{
                        headerShown: false,
                        title: "Profile",
                        tabBarLabel: "Profile",
                        tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
                    }}
                />
            </Tabs>
        </AuthGate>
    );
}
