import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { STACK_SCREENS } from '@/app/stack-screens';

// Rejects if the splash is already hidden or the module is unavailable;
// unhandled, that surfaces as a bootstrap-time promise rejection.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Flat stack per architecture.md's routing decision: index → segment/[id] →
// session/[id], no tab bar and no route group (UX-DR10). The Stack ancestor
// is what handles the PUSH action for every non-index route — a bare tab
// navigator has none, which is why pushes were silently dropped before
// (commit b2dc4e6). STACK_SCREENS lives in stack-screens.ts, not here, so
// its route-coverage guarantee is testable without also pulling in
// AnimatedSplashOverlay's react-native-reanimated dependency.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        {STACK_SCREENS.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack>
    </ThemeProvider>
  );
}
