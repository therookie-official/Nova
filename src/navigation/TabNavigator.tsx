import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { HomeScreen } from '@/screens/HomeScreen';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { RemoteSourcesScreen } from '@/screens/RemoteSourcesScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { WatchlistScreen } from '@/screens/WatchlistScreen';
import { colors } from '@/theme/tokens';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: {
  name: keyof TabParamList;
  label: string;
  icon: IconName;
  iconActive: IconName;
}[] = [
  { name: 'Home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'Library', label: 'Library', icon: 'film-outline', iconActive: 'film' },
  { name: 'Sources', label: 'Sources', icon: 'cloud-outline', iconActive: 'cloud' },
  { name: 'Watchlist', label: 'Watchlist', icon: 'bookmark-outline', iconActive: 'bookmark' },
  { name: 'Settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

const COMPONENTS = {
  Home: HomeScreen,
  Library: LibraryScreen,
  Sources: RemoteSourcesScreen,
  Watchlist: WatchlistScreen,
  Settings: SettingsScreen,
} as const;

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primarySoft,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={COMPONENTS[tab.name]}
          options={{
            tabBarLabel: tab.label,
            tabBarButtonTestID: `tab-${tab.name}`,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size + 2} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
