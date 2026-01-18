import { useTheme } from "@/providers/ThemeProvider";

export function useThemeColor() {
    const { activeTheme } = useTheme();
    return activeTheme;
}
