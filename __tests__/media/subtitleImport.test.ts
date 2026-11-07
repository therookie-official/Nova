import * as DocumentPicker from 'expo-document-picker';
import { pickSubtitleFile } from '@/services/media/subtitleImport';
import { safAccess } from '@/services/media/novaSaf';

jest.mock('@/services/media/novaSaf', () => ({
  safAccess: { persist: jest.fn(() => Promise.resolve(true)) },
}));
const picker = DocumentPicker.getDocumentAsync as jest.Mock;

describe('pickSubtitleFile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts any file type in the picker but decides from the name', async () => {
    picker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'content://s/1', name: 'Film.hi.vtt', mimeType: 'application/octet-stream' }],
    });
    const r = await pickSubtitleFile();
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({ type: '*/*', copyToCacheDirectory: false }),
    );
    expect(r).toEqual({
      status: 'picked',
      subtitle: { uri: 'content://s/1', title: 'Film hi', format: 'vtt', persisted: true },
    });
    expect(safAccess.persist).toHaveBeenCalledWith('content://s/1');
  });
  it('refuses unsupported types without asking for persistence', async () => {
    picker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'content://s/2', name: 'a.ass' }],
    });
    const r = await pickSubtitleFile();
    expect(r.status).toBe('unsupported');
    expect(safAccess.persist).not.toHaveBeenCalled();
  });
  it('reports cancel and picker failure', async () => {
    picker.mockResolvedValue({ canceled: true, assets: null });
    expect((await pickSubtitleFile()).status).toBe('cancelled');
    picker.mockRejectedValue(new Error('x'));
    expect((await pickSubtitleFile()).status).toBe('error');
  });
});
