import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAutosave } from './useAutosave';

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces and calls saveFn once with merged changes', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave<{ a?: string; b?: string }>(saveFn, 800));

    act(() => { result.current.handleChange('a', '1'); });
    act(() => { result.current.handleChange('b', '2'); });
    expect(saveFn).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith({ a: '1', b: '2' });
    expect(result.current.status).toBe('saved');
  });

  it('sets status to error when saveFn rejects', async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useAutosave<{ a?: string }>(saveFn, 800));
    act(() => { result.current.handleChange('a', 'x'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(result.current.status).toBe('error');
  });

  it('preserves and reschedules an edit made while a save is in flight', async () => {
    let resolveFirst!: () => void;
    const saveFn = vi.fn()
      .mockImplementationOnce(() => new Promise<void>(r => { resolveFirst = r; }))
      .mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave<{ a?: string; b?: string }>(saveFn, 800));

    act(() => { result.current.handleChange('a', '1'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); }); // save #1 ({a}) now in flight
    expect(saveFn).toHaveBeenNthCalledWith(1, { a: '1' });

    act(() => { result.current.handleChange('b', '2'); }); // edit during the in-flight save
    await act(async () => { resolveFirst(); await Promise.resolve(); await Promise.resolve(); }); // save #1 resolves
    await act(async () => { await vi.advanceTimersByTimeAsync(800); }); // reschedule flushes save #2

    expect(saveFn).toHaveBeenNthCalledWith(2, { b: '2' }); // 'b' was preserved, not dropped
  });

  // Reproduces the P1 concurrency race: two saveFn calls overlap and complete
  // out of order, silently dropping the newer edit. Observed RED on the pre-fix
  // code (maxConcurrent === 2 and serverValue === 'A'); GREEN after the
  // re-entrancy guard serializes saves.
  it('serializes saves so overlapping out-of-order completion never loses an edit', async () => {
    let inFlight = 0;
    let maxConcurrent = 0;
    let serverValue: string | undefined; // "server" state written when a save completes
    const pending: Array<() => void> = []; // manual resolvers, so we control completion order

    const saveFn = vi.fn((data: { name?: string }) => {
      const captured = data.name; // the value THIS call would persist
      inFlight++;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      return new Promise<void>(resolve => {
        pending.push(() => {
          serverValue = captured; // the server applies this write on completion
          inFlight--;
          resolve();
        });
      });
    });

    const { result } = renderHook(() => useAutosave<{ name?: string }>(saveFn, 800));

    // 1. Edit 'A'; let the debounce fire -> save #1 (saveFn({name:'A'})) is in flight.
    act(() => { result.current.handleChange('name', 'A'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(saveFn).toHaveBeenNthCalledWith(1, { name: 'A' });

    // 2-3. Edit 'B' while #1 is still in flight; let its debounce fire. On the
    //      buggy code this starts a SECOND concurrent saveFn({name:'B'}); the
    //      guard must instead defer it until #1 completes.
    act(() => { result.current.handleChange('name', 'B'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });

    // 4. Complete the most-recently-started save FIRST (out-of-order). On buggy
    //    code that is save #2 ('B'); on fixed code only save #1 exists.
    await act(async () => {
      pending.pop()!();
      await Promise.resolve(); await Promise.resolve();
    });
    // 5. Complete whatever is still in flight (the stale save #1 on buggy code).
    await act(async () => {
      while (pending.length) { pending.shift()!(); await Promise.resolve(); await Promise.resolve(); }
    });
    // Flush any save the completion handler rescheduled (fixed code sends 'B' here)...
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    await act(async () => {
      while (pending.length) { pending.shift()!(); await Promise.resolve(); await Promise.resolve(); }
    });

    // (a) saveFn was never invoked while a prior saveFn call was still in flight.
    expect(maxConcurrent).toBe(1);
    // (b) No edit lost: the last user value 'B' is what the server ends up with,
    //     never the stale 'A' from the overlapping save.
    expect(serverValue).toBe('B');
  });
});
