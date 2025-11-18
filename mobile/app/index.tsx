import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/(tabs)/dashboard");
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#0f1729", "#1e1b4b", "#0f1729"]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo/Title */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>UniRizz</Text>
          <Text style={styles.subtitle}>
            Connect with your campus community
          </Text>
        </View>

        {/* University Selection */}
        <View style={styles.universityContainer}>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            style={styles.universityCard}
          >
            <Text style={styles.universityName}>MediCaps University</Text>
            <Text style={styles.universityLocation}>Indore, Madhya Pradesh</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Text */}
        <View style={styles.bottomContainer}>
          <Text style={styles.bottomText}>More universities coming soon</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f1729",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 20,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 48,
  },
  logo: {
    fontSize: 60,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  universityContainer: {
    width: "100%",
    maxWidth: 400,
  },
  universityCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  universityName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  universityLocation: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 48,
  },
  bottomText: {
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
  },
});
