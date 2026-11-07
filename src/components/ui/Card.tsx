import type { ReactNode } from 'react';
import { View } from 'react-native';

export function Card({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} className="rounded-card border border-border bg-surface p-4">
      {children}
    </View>
  );
}
