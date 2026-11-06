import { libraryRepository, remoteSourcesRepository } from '@/services/storage/repositories';
import { createListStore } from './createListStore';

export const useLibraryStore = createListStore(libraryRepository);
export const useRemoteSourcesStore = createListStore(remoteSourcesRepository);
