import { toast } from 'sonner';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';

/**
 * For mutations started from a button with no form around it: the failure still has to be
 * said. `overrides` words a code for this screen (the API's codes are shared by many).
 */
export function toastError(error: unknown, overrides: Record<string, string> = {}) {
  const code = isApiError(error) ? error.code : undefined;
  toast.error((code && overrides[code]) || messageFor(code));
}
