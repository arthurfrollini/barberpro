import { afterEach, describe, expect, it } from 'vitest';
import { choose, readChoice } from './choice';

describe('workspace choice', () => {
  afterEach(() => sessionStorage.clear());

  it('is kept per user', () => {
    choose('user-a', 'shop-1');
    expect(readChoice('user-a')).toBe('shop-1');
    expect(readChoice('user-b')).toBeNull();
  });

  it("starts a new tab on the user's last choice", () => {
    choose('user-a', 'shop-1');
    sessionStorage.clear(); // a new tab has its own session storage
    expect(readChoice('user-a')).toBe('shop-1');
  });

  it('is not changed by a switch in another tab', () => {
    choose('user-a', 'shop-1');
    // another tab switching writes the shared starting point, not this tab's choice
    localStorage.setItem('barberpro.workspace.user-a', 'shop-2');
    window.dispatchEvent(new StorageEvent('storage', { key: 'barberpro.workspace.user-a' }));
    expect(readChoice('user-a')).toBe('shop-1');
  });
});
