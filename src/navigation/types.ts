import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Sources: undefined;
  Watchlist: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  MovieDetails: { itemId: string };
  Player: { itemId: string };
  SupportNova: undefined;
};

declare global {
  namespace ReactNavigation {
    // Makes useNavigation()/navigate() type-checked against Nova's routes.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
