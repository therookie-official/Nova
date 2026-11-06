import { SAMPLE_DATA_ENABLED } from '@/config/flags';
import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation/RootNavigator';
import { navigationTheme } from '@/navigation/theme';
import { seedPlaceholdersOnFirstRun } from '@/services/dev/placeholders';

/** The whole app tree. Kept out of App.tsx so tests can render it directly. */
export function AppRoot() {
  useEffect(() => {
    // Development and preview builds only: adds invented sample data once, on an empty library.
    seedPlaceholdersOnFirstRun(SAMPLE_DATA_ENABLED);
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
