import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { ApiError } from './errors';
import { createQueryClient, refetchOnForeground } from './query-client';

describe('query client', () => {
  it('retries network failures and timeouts, never domain errors', () => {
    const retry = createQueryClient().getDefaultOptions().queries!.retry as (
      count: number,
      error: unknown,
    ) => boolean;
    expect(retry(0, new ApiError('NETWORK_ERROR', ''))).toBe(true);
    expect(retry(1, new ApiError('TIMEOUT', ''))).toBe(true);
    expect(retry(2, new ApiError('TIMEOUT', ''))).toBe(false);
    expect(retry(0, new ApiError('SLOT_UNAVAILABLE', ''))).toBe(false);
  });

  it('treats the app coming to the foreground as focus', () => {
    let onChange: (state: string) => void = () => {};
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      onChange = listener as never;
      return { remove } as never;
    });
    const setFocused = jest.spyOn(focusManager, 'setFocused');

    const stop = refetchOnForeground();
    onChange('background');
    onChange('active');
    stop();

    expect(setFocused.mock.calls).toEqual([[false], [true]]);
    expect(remove).toHaveBeenCalled();
  });
});
