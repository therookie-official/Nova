import {
  PLACEHOLDER_HISTORY,
  PLACEHOLDER_LIBRARY,
  PLACEHOLDER_PROGRESS,
  PLACEHOLDER_REMOTE_SOURCES,
  PLACEHOLDER_WATCHLIST_IDS,
} from '@/config/placeholderData';
import { useHistoryStore } from '@/store/historyStore';
import { useLibraryStore, useRemoteSourcesStore } from '@/store/libraryStore';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWatchlistStore } from '@/store/watchlistStore';

/** Adds the development sample data without touching anything the user added. */
export function loadPlaceholderData(): void {
  const library = useLibraryStore.getState();
  PLACEHOLDER_LIBRARY.forEach((item) => library.add(item));

  const sources = useRemoteSourcesStore.getState();
  PLACEHOLDER_REMOTE_SOURCES.forEach((source) => sources.add(source));

  const progress = useProgressStore.getState();
  PLACEHOLDER_PROGRESS.forEach((entry) => progress.set(entry));

  const history = useHistoryStore.getState();
  PLACEHOLDER_HISTORY.forEach((entry) => history.record(entry));

  const watchlist = useWatchlistStore.getState();
  PLACEHOLDER_WATCHLIST_IDS.forEach((id) => {
    if (!watchlist.has(id)) watchlist.toggle(id);
  });

  useSettingsStore.getState().update({ placeholdersSeeded: true });
}

/** Removes only records flagged as placeholders. User data is left alone. */
export function clearPlaceholderData(): void {
  const placeholderIds = new Set(PLACEHOLDER_LIBRARY.map((item) => item.id));

  const library = useLibraryStore.getState();
  library.replaceAll(library.items.filter((item) => !item.isPlaceholder));

  const sources = useRemoteSourcesStore.getState();
  sources.replaceAll(sources.items.filter((source) => !source.isPlaceholder));

  const progress = useProgressStore.getState();
  Object.keys(progress.byItem)
    .filter((id) => placeholderIds.has(id))
    .forEach((id) => progress.clear(id));

  const history = useHistoryStore.getState();
  history.entries
    .filter((e) => placeholderIds.has(e.itemId))
    .forEach((e) => history.forget(e.itemId));

  const watchlist = useWatchlistStore.getState();
  watchlist.ids.filter((id) => placeholderIds.has(id)).forEach((id) => watchlist.remove(id));
}

/** First launch of a development build: offer sample data once, only if the library is empty. */
export function seedPlaceholdersOnFirstRun(isDevelopment: boolean): void {
  if (!isDevelopment) return;
  const { placeholdersSeeded } = useSettingsStore.getState();
  if (placeholdersSeeded) return;
  if (useLibraryStore.getState().items.length > 0) {
    useSettingsStore.getState().update({ placeholdersSeeded: true });
    return;
  }
  loadPlaceholderData();
}
