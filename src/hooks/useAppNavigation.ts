import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '@/navigation/types';

export function useAppNavigation() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return {
    navigation,
    openDetails: (itemId: string) => navigation.navigate('MovieDetails', { itemId }),
    openPlayer: (itemId: string) => navigation.navigate('Player', { itemId }),
    openAddRemote: () => navigation.navigate('AddRemote'),
    openEdit: (itemId: string) => navigation.navigate('EditMetadata', { itemId }),
    openSupport: () => navigation.navigate('SupportNova'),
    openTab: (screen: keyof TabParamList) => navigation.navigate('Tabs', { screen }),
    goBack: () => navigation.goBack(),
  };
}
