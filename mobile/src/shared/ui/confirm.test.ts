import { Alert, Platform } from 'react-native';
import { confirm } from './confirm';

const ask = { title: 'Cancelar?', message: 'Corte', confirmLabel: 'Cancelar agendamento' };

describe('confirm', () => {
  it('uses the system alert on a phone, and treats dismissing it as no', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, _b, options) => {
      options?.onDismiss?.();
    });
    await expect(confirm(ask)).resolves.toBe(false);
    alert.mockRestore();
  });

  it('uses the browser confirm on web', async () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    (globalThis as { confirm?: unknown }).confirm = jest.fn(() => true);
    await expect(confirm(ask)).resolves.toBe(true);
    expect(globalThis.confirm).toHaveBeenCalledWith('Cancelar?\n\nCorte');
    delete (globalThis as { confirm?: unknown }).confirm;
    await expect(confirm(ask)).resolves.toBe(false);
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  });
});
