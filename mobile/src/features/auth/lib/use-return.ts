import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

/**
 * After signing in: back to the screen that sent the user here when it is still under this
 * one (it re-renders signed in, its state intact), or to `back` when the app was opened right
 * on the sign-in screen. Pushing `back` instead would leave two copies of it in the stack.
 */
export function useReturn(back: string | null) {
  const router = useRouter();
  return useCallback(() => {
    if (back && router.canGoBack()) router.back();
    else router.replace((back ?? '/') as Href);
  }, [back, router]);
}
