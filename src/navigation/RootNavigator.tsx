import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MovieDetailsScreen } from '@/screens/MovieDetailsScreen';
import { PlayerScreen } from '@/screens/PlayerScreen';
import { SupportNovaScreen } from '@/screens/SupportNovaScreen';
import { colors } from '@/theme/tokens';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: 20, fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="MovieDetails"
        component={MovieDetailsScreen}
        options={{ title: 'Details' }}
      />
      <Stack.Screen name="Player" component={PlayerScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="SupportNova"
        component={SupportNovaScreen}
        options={{ title: 'Support Nova' }}
      />
    </Stack.Navigator>
  );
}
