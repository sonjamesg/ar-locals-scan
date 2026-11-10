/**
 * Run `worker(item, index, slot)` over items with at most `limit` in flight.
 * Results keep input order. `onDone(doneCount, total)` fires as each finishes.
 * Each slot is set up once (e.g. a hidden tab) and always torn down.
 */
export async function runPool(items, limit, worker, { onDone, setup, teardown } = {}) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  let next = 0, done = 0;
  const n = Math.max(1, Math.min(limit | 0 || 1, list.length || 1));
  async function lane(laneNo) {
    let slot;
    try {
      slot = setup ? await setup(laneNo) : undefined;
      while (next < list.length) {
        const i = next++;
        try { results[i] = await worker(list[i], i, slot); }
        catch (e) { results[i] = { __error: e }; }
        done++;
        try { onDone && onDone(done, list.length, i); } catch {}
      }
    } finally {
      if (teardown && slot !== undefined) { try { await teardown(slot); } catch {} }
    }
  }
  if (list.length) await Promise.all(Array.from({ length: n }, (_, k) => lane(k)));
  return results;
}
