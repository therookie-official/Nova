import { createMemoryStore } from '@/services/storage/kvStore';
import { createRepository } from '@/services/storage/repository';

const isNumberArray = (data: unknown): data is number[] =>
  Array.isArray(data) && data.every((n) => typeof n === 'number');

function setup(initial: Record<string, string> = {}, version = 1) {
  const store = createMemoryStore(initial);
  const repo = createRepository<number[]>({
    key: 'test.numbers',
    version,
    defaults: () => [],
    validate: isNumberArray,
    migrate: (data, from) => (from === 1 && Array.isArray(data) ? data.map(Number) : undefined),
    storage: () => store,
  });
  return { store, repo };
}

describe('repository', () => {
  it('returns defaults when nothing is stored', () => {
    expect(setup().repo.load()).toEqual([]);
  });

  it('round-trips saved data', () => {
    const { repo } = setup();
    repo.save([1, 2, 3]);
    expect(repo.load()).toEqual([1, 2, 3]);
  });

  it('survives a "restart": a second repository on the same store sees the data', () => {
    const { store, repo } = setup();
    repo.save([4, 5]);
    const reopened = createRepository<number[]>({
      key: 'test.numbers',
      version: 1,
      defaults: () => [],
      validate: isNumberArray,
      storage: () => store,
    });
    expect(reopened.load()).toEqual([4, 5]);
  });

  it('reset removes the data', () => {
    const { repo } = setup();
    repo.save([1]);
    repo.reset();
    expect(repo.load()).toEqual([]);
  });

  it('keeps unreadable JSON in a .corrupt slot and returns defaults', () => {
    const { store, repo } = setup({ 'test.numbers': '{not json' });
    expect(repo.load()).toEqual([]);
    expect(store.getString('test.numbers.corrupt')).toBe('{not json');
  });

  it('treats a wrong shape as corrupt', () => {
    const raw = JSON.stringify({ v: 1, data: ['a', 'b'] });
    const { store, repo } = setup({ 'test.numbers': raw });
    expect(repo.load()).toEqual([]);
    expect(store.getString('test.numbers.corrupt')).toBe(raw);
  });

  it('treats a missing envelope as corrupt', () => {
    const raw = JSON.stringify([1, 2, 3]);
    const { store, repo } = setup({ 'test.numbers': raw });
    expect(repo.load()).toEqual([]);
    expect(store.getString('test.numbers.corrupt')).toBe(raw);
  });

  it('does not guess at data written by a newer version', () => {
    const raw = JSON.stringify({ v: 9, data: [1] });
    const { store, repo } = setup({ 'test.numbers': raw }, 2);
    expect(repo.load()).toEqual([]);
    expect(store.getString('test.numbers.corrupt')).toBe(raw);
  });

  it('migrates data written by an older version', () => {
    const { repo } = setup({ 'test.numbers': JSON.stringify({ v: 1, data: ['7', '8'] }) }, 2);
    expect(repo.load()).toEqual([7, 8]);
  });

  it('gives up cleanly when no migration is available', () => {
    const store = createMemoryStore({ 'test.numbers': JSON.stringify({ v: 1, data: [1] }) });
    const repo = createRepository<number[]>({
      key: 'test.numbers',
      version: 2,
      defaults: () => [],
      validate: isNumberArray,
      storage: () => store,
    });
    expect(repo.load()).toEqual([]);
  });
});
