import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen name="create-service" options={{ headerShown: false }} />
        <Stack.Screen
          name="create-service-category"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="create-service-subcategory"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="create-service-form"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="service-detail/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="edit-service/[id]/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="edit-service/[id]/category"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="edit-service/[id]/information"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="edit-service/[id]/pricing"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="edit-service/[id]/delete"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="edit-service/[id]/delete-reason"
          options={{ headerShown: false }}
        />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
