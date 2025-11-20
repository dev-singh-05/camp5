import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function RatingsTab() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new ratings implementation
    router.replace("/ratings");
  }, []);

  return (
    <LinearGradient colors={["#0f1729", "#1e1b4b", "#0f1729"]} style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
