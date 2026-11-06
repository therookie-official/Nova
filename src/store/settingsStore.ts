import { create } from 'zustand';
import type { Repository } from '@/services/storage';
import { settingsRepository } from '@/services/storage/repositories';
import type { Settings } from '@/types/media';

export interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
}

export function createSettingsStore(repository: Repository<Settings>) {
  return create<SettingsState>((set, get) => ({
    ...repository.load(),
    update: (patch) => {
      const { update: _update, ...current } = get();
      const next: Settings = { ...current, ...patch };
      repository.save(next);
      set(next);
    },
  }));
}

export const useSettingsStore = createSettingsStore(settingsRepository);
