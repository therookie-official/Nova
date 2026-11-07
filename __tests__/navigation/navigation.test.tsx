import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AppRoot } from '@/AppRoot';
import { clearPlaceholderData } from '@/services/dev/placeholders';
import { useLibraryStore } from '@/store/libraryStore';
import { useWatchlistStore } from '@/store/watchlistStore';

async function openTab(name: string) {
  await fireEvent.press(await screen.findByTestId(`tab-${name}`));
}

// Tests that add their own items must not leak them into later tests (stores are module-level).
afterEach(() => {
  const library = useLibraryStore.getState();
  library.replaceAll(library.items.filter((item) => item.isPlaceholder));
});

describe('app navigation', () => {
  it('starts on Home and shows sample data from the first-run seed (development build)', async () => {
    await render(<AppRoot />);
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(await screen.findByText('Recently added')).toBeTruthy();
    expect(useLibraryStore.getState().items.length).toBeGreaterThan(0);
  });

  it('switches between all five bottom tabs', async () => {
    await render(<AppRoot />);

    await openTab('Library');
    expect(await screen.findByTestId('screen-library')).toBeTruthy();

    await openTab('Sources');
    expect(await screen.findByTestId('screen-sources')).toBeTruthy();

    await openTab('Watchlist');
    expect(await screen.findByTestId('screen-watchlist')).toBeTruthy();

    await openTab('Settings');
    expect(await screen.findByTestId('screen-settings')).toBeTruthy();

    await openTab('Home');
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
  });

  it('opens Movie Details from the library, then the Player, then goes back', async () => {
    await render(<AppRoot />);
    await openTab('Library');

    await fireEvent.press(await screen.findByTestId('media-card-sample-low-orbit'));
    const details = await screen.findByTestId('screen-details');
    expect(within(details).getByText('Low Orbit')).toBeTruthy();

    // Sample data has saved progress for this title, so the button offers to resume.
    await fireEvent.press(within(details).getByLabelText('Resume from 45:00'));
    expect(await screen.findByTestId('screen-player')).toBeTruthy();
    expect(screen.getByTestId('video')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('player-back'));
    expect(await screen.findByTestId('screen-details')).toBeTruthy();
  });

  it('opens Support Nova from Settings', async () => {
    await render(<AppRoot />);
    await openTab('Settings');
    await fireEvent.press(await screen.findByTestId('open-support'));
    expect(await screen.findByTestId('screen-support')).toBeTruthy();
    expect(screen.getByText('Contributions are not available yet.')).toBeTruthy();
  });

  it('adds to the watchlist from Details and shows it on the Watchlist tab', async () => {
    await render(<AppRoot />);
    await openTab('Library');
    await fireEvent.press(await screen.findByTestId('media-card-sample-paper-kites'));
    const details = await screen.findByTestId('screen-details');
    await fireEvent.press(within(details).getByLabelText('Add to watchlist'));
    expect(useWatchlistStore.getState().ids).toContain('sample-paper-kites');
  });

  it('filters the library with the search box and recovers with Clear filters', async () => {
    await render(<AppRoot />);
    await openTab('Library');
    const search = await screen.findByTestId('library-search');

    await fireEvent.changeText(search, 'orbit');
    expect(await screen.findByTestId('media-card-sample-low-orbit')).toBeTruthy();
    expect(screen.queryByTestId('media-card-sample-night-orchard')).toBeNull();

    await fireEvent.changeText(search, 'zzzz');
    expect(await screen.findByText('No matches')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Clear filters'));
    expect(await screen.findByTestId('media-card-sample-night-orchard')).toBeTruthy();
  });

  it('filters by category chip', async () => {
    await render(<AppRoot />);
    await openTab('Library');
    await fireEvent.press(await screen.findByTestId('genre-Sci-Fi'));
    expect(await screen.findByTestId('media-card-sample-low-orbit')).toBeTruthy();
    expect(screen.queryByTestId('media-card-sample-night-orchard')).toBeNull();
  });

  it('edits metadata and the library shows the new title', async () => {
    await render(<AppRoot />);
    await openTab('Library');
    await fireEvent.press(await screen.findByTestId('media-card-sample-night-orchard'));
    await fireEvent.press(await screen.findByTestId('details-edit'));
    await fireEvent.changeText(await screen.findByTestId('edit-title'), 'Night Orchard Edited');
    await fireEvent.changeText(screen.getByTestId('edit-genres'), 'Noir, Thriller');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(await screen.findByText('Night Orchard Edited')).toBeTruthy();
    expect(
      useLibraryStore.getState().items.find((i) => i.id === 'sample-night-orchard')?.metadata
        .genres,
    ).toEqual(['Noir', 'Thriller']);
  });

  it('validates the edit form', async () => {
    await render(<AppRoot />);
    await openTab('Library');
    await fireEvent.press(await screen.findByTestId('media-card-sample-night-orchard'));
    await fireEvent.press(await screen.findByTestId('details-edit'));
    await fireEvent.changeText(await screen.findByTestId('edit-title'), '   ');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(await screen.findByText('Enter a title.')).toBeTruthy();
  });

  it('adds a remote link end to end (probe mocked) and opens its details', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'video/mp4' },
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await render(<AppRoot />);
    await openTab('Sources');
    await fireEvent.press(await screen.findByTestId('add-remote'));
    await fireEvent.changeText(
      await screen.findByTestId('remote-url-input'),
      'https://videos.test/movie.m3u8',
    );
    await fireEvent.changeText(screen.getByTestId('remote-title-input'), 'My Stream');
    await fireEvent.press(screen.getByTestId('remote-save'));
    expect(await screen.findByTestId('screen-details')).toBeTruthy();
    expect(screen.getByText('My Stream')).toBeTruthy();
    expect(screen.getByText('Online · HLS')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalled();
  });

  it('rejects a bad link without a network call and a DASH link while DASH is off', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await render(<AppRoot />);
    await openTab('Sources');
    await fireEvent.press(await screen.findByTestId('add-remote'));
    const input = await screen.findByTestId('remote-url-input');
    await fireEvent.changeText(input, 'http://videos.test/a.mp4');
    await fireEvent.press(screen.getByTestId('remote-save'));
    expect(await screen.findByText(/Only secure links/)).toBeTruthy();
    await fireEvent.changeText(input, 'https://videos.test/a.mpd');
    await fireEvent.press(screen.getByTestId('remote-save'));
    expect(await screen.findByText(/DASH \(.mpd\) links are not enabled/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers Save anyway when the server check fails', async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    await render(<AppRoot />);
    await openTab('Sources');
    await fireEvent.press(await screen.findByTestId('add-remote'));
    await fireEvent.changeText(
      await screen.findByTestId('remote-url-input'),
      'https://videos.test/a.mp4',
    );
    await fireEvent.press(screen.getByTestId('remote-save'));
    expect(await screen.findByText(/Could not reach this link/)).toBeTruthy();
    await fireEvent.press(await screen.findByLabelText('Save anyway'));
    expect(await screen.findByTestId('screen-details')).toBeTruthy();
  });

  it('shows an empty state once sample data is cleared', async () => {
    await render(<AppRoot />);
    await act(async () => {
      clearPlaceholderData();
    });
    await openTab('Library');
    expect(await screen.findByText('No videos yet')).toBeTruthy();
  });
});
