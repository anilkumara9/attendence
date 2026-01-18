import Colors, { Theme } from "@/constants/colors";
import React, { createContext, useContext, useState } from "react";
import { useColorScheme } from "react-native";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    activeTheme: Theme;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState<ThemeMode>("system");

    const isDark =
        themeMode === "system"
            ? systemColorScheme === "dark"
            : themeMode === "dark";

    const activeTheme = isDark ? Colors.dark : Colors.light;

    return (
        <ThemeContext.Provider value={{ themeMode, setThemeMode, activeTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
