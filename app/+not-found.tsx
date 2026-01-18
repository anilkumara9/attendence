import { Link, Stack } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <View style={styles.page} testID="not-found">
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.card}>
        <Text style={styles.title}>That page doesn’t exist</Text>
        <Text style={styles.subtitle}>
          Use the button below to return to the app.
        </Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Go to Attendance</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.light.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.muted,
    lineHeight: 16,
  },
  link: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: Colors.light.tint,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
