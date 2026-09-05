/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // react-native's useColorScheme() returns 'light' | 'dark' | null |
  // undefined — never the string 'unspecified'. [Review][Patch, CRITICAL]
  // found via code review 2026-09-05: the old `scheme === 'unspecified'`
  // check never matched, so a null/undefined scheme (e.g. before the OS
  // reports a preference) fell through unguarded into Colors[undefined].
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
