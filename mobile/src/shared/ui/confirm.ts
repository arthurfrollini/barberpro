import { Alert, Platform } from 'react-native';

/**
 * Asks before something that cannot be undone: the system alert on a phone, the browser's
 * confirm on web (where Alert.alert does nothing). Resolves true only on the confirm button.
 */
export function confirm({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Voltar',
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
