import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AppRoot } from '@/AppRoot';
import { clearPlaceholderData } from '@/services/dev/placeholders';
import { useLibraryStore } from '@/store/libraryStore';
import { useWatchlistStore } from '@/store/watchlistStore';

async function openTab(name: string) {
  await fireEvent.press(await screen.findByTestId(`tab-${name}`));
}

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

    await fireEvent.press(within(details).getByLabelText('Play'));
    expect(await screen.findByTestId('screen-player')).toBeTruthy();
    expect(screen.getByText('Player placeholder')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Back'));
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

  it('filters the library with the search box and recovers with Clear search', async () => {
    await render(<AppRoot />);
    await openTab('Library');
    const search = await screen.findByTestId('library-search');

    await fireEvent.changeText(search, 'orbit');
    expect(await screen.findByTestId('media-card-sample-low-orbit')).toBeTruthy();
    expect(screen.queryByTestId('media-card-sample-night-orchard')).toBeNull();

    await fireEvent.changeText(search, 'zzzz');
    expect(await screen.findByText('No matches')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Clear search'));
    expect(await screen.findByTestId('media-card-sample-night-orchard')).toBeTruthy();
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
