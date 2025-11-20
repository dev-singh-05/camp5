import "dotenv/config";

const enableDatingTestValue = process.env.EXPO_PUBLIC_ENABLE_DATING_TEST === "true";

export default {
  expo: {
    name: "UniRizz",
    slug: "unirizz",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "unirizz",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0f1729",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.unirizz.app",
      buildNumber: "1.0.0",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0f1729",
      },
      package: "com.unirizz.app",
      versionCode: 1,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
      ],
      softwareKeyboardLayoutMode: "pan",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission:
            "UniRizz needs access to your photos for profile pictures and verification documents.",
          cameraPermission:
            "UniRizz needs access to your camera to take photos for your profile.",
        },
      ],
      [
        "expo-document-picker",
        {
          iCloudContainerEnvironment: "Production",
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "unirizz-mobile",
      },
      // Environment variables
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      enableDatingTest: enableDatingTestValue,
    },
  },
};
