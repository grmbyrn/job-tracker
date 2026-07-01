import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API client the composable imports; each test sets the resolved value.
const get = vi.fn();
vi.mock('../api/client.js', () => ({ default: { get: (...a) => get(...a) } }));

import { useCollection } from './collection.js';

describe('useCollection', () => {
  beforeEach(() => get.mockReset());

  it('fetchAll reads the array under the envelope key (not data.items)', async () => {
    get.mockResolvedValue({ data: { contacts: [{ id: '1' }, { id: '2' }] } });
    const c = useCollection('/contacts', 'contacts');

    await c.fetchAll();

    expect(get).toHaveBeenCalledWith('/contacts');
    expect(c.items.value).toHaveLength(2);
    expect(c.loading.value).toBe(false);
  });

  it('fetchAll defaults to [] when the key is absent', async () => {
    get.mockResolvedValue({ data: {} });
    const c = useCollection('/contacts', 'contacts');
    await c.fetchAll();
    expect(c.items.value).toEqual([]);
  });

  it('fetchAll captures the error and stops loading', async () => {
    const boom = new Error('network');
    // Throw synchronously (no promise) so there's no rejected-promise timing for
    // vitest to flag; fetchAll's try/catch still catches it via the `await` expr.
    get.mockImplementationOnce(() => {
      throw boom;
    });
    const c = useCollection('/contacts', 'contacts');
    await c.fetchAll();
    expect(c.error.value).toBe(boom);
    expect(c.loading.value).toBe(false);
  });

  it('upsert prepends a new item and replaces an existing one', () => {
    const c = useCollection('/contacts', 'contacts');
    c.items.value = [{ id: 'a', name: 'A' }];

    c.upsert({ id: 'b', name: 'B' });
    expect(c.items.value.map((x) => x.id)).toEqual(['b', 'a']);

    c.upsert({ id: 'a', name: 'A2' });
    expect(c.items.value.find((x) => x.id === 'a').name).toBe('A2');
    expect(c.items.value).toHaveLength(2);
  });

  it('removeById drops the matching item', () => {
    const c = useCollection('/contacts', 'contacts');
    c.items.value = [{ id: 'a' }, { id: 'b' }];
    c.removeById('a');
    expect(c.items.value.map((x) => x.id)).toEqual(['b']);
  });
});
