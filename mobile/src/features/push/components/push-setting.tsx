import { StyleSheet, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';
import { space } from '@/shared/ui/theme';
import { useEnablePush, usePushPermission } from '../hooks/use-push';
import { usePushDevice } from '../lib/push-device';

/** Conta's row: on, off in the phone's settings, or not decided yet. */
export function PushSetting() {
  const device = usePushDevice();
  const permission = usePushPermission();
  const enable = useEnablePush();
  if (!device.supported || !permission.data) return null;

  const state = enable.data ?? permission.data;
  return (
    <View style={styles.row}>
      <Text variant="label">Avisos no celular</Text>
      {state === 'granted' ? (
        <Text variant="muted">Ativados neste celular.</Text>
      ) : state === 'denied' ? (
        <>
          <Text variant="muted">Desativados nos Ajustes do celular.</Text>
          <Button label="Abrir Ajustes" variant="secondary" onPress={device.openSettings} />
        </>
      ) : (
        <>
          <Text variant="muted">
            Saiba na hora quando um agendamento mudar, e receba o lembrete.
          </Text>
          <Button
            label="Ativar avisos"
            variant="secondary"
            loading={enable.isPending}
            onPress={() => enable.mutate()}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ row: { gap: space.sm } });
