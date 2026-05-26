import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { BusinessSignupProvider } from "@/contexts/BusinessSignupContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <BusinessSignupProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
            <Stack.Screen name="edit-avatar" options={{ headerShown: false }} />
            <Stack.Screen
              name="affiliations"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="about-me" options={{ headerShown: false }} />
            <Stack.Screen name="update-name" options={{ headerShown: false }} />
            <Stack.Screen
              name="update-phone"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="update-email"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="profile-type"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="profile-type-pending"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="business-details"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="verify-business"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="update-bank-account"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="customer-support"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="submit-ticket"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="my-tickets"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ticket-detail/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="earnings" options={{ headerShown: false }} />
            <Stack.Screen name="schedule" options={{ headerShown: false }} />
            <Stack.Screen
              name="earning-history"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="manage-payout-methods"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="withdraw" options={{ headerShown: false }} />
            <Stack.Screen
              name="withdrawal-history"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="background-check-1"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="background-check-2"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="background-check-3"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="background-check-4"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="create-service"
              options={{ headerShown: false }}
            />
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
        </BusinessSignupProvider>

        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
