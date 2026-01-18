import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

export default function ModalScreen() {
  const Theme = useThemeColor();
  const styles = useMemo(() => createStyles(Theme), [Theme]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <View style={styles.modalContent} testID="generic-modal">
          <Text style={styles.title}>MyClass</Text>
          <Text style={styles.description}>
            This is a system modal route. You can repurpose it for confirmations or
            announcements.
          </Text>
          <Pressable
            testID="generic-modal-close"
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </Pressable>

      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </Modal>
  );
}

const createStyles = (Theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: Theme.card,
      borderRadius: 24,
      padding: 24,
      margin: 20,
      alignItems: "center",
      width: 320,
      borderWidth: 1,
      borderColor: Theme.border,
    },
    title: {
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 8,
      color: Theme.text,
    },
    description: {
      textAlign: "center",
      marginBottom: 20,
      color: Theme.muted,
      lineHeight: 18,
      fontSize: 13,
      fontWeight: "600",
    },
    closeButton: {
      backgroundColor: Theme.tint,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 16,
      minWidth: 140,
      alignItems: "center",
    },
    closeButtonPressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.95,
    },
    closeButtonText: {
      color: "#FFFFFF",
      fontWeight: "900",
      textAlign: "center",
      fontSize: 13,
    },
  });
