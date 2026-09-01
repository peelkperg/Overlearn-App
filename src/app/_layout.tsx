import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

// Root navigator: a Stack over the tab group, not a bare NativeTabs. The tab
// router only understands JUMP_TO between its own declared tabs — routes
// pushed from inside a tab (segment/new, segment/[id], session/[id]) need a
// Stack ancestor to handle the PUSH action, or it's silently dropped.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="segment/new" />
        <Stack.Screen name="segment/[id]" />
        <Stack.Screen name="session/[id]" />
      </Stack>
    </ThemeProvider>
  );
}
