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
});
