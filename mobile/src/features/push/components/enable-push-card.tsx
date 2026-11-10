import { StyleSheet, View } from 'react-native';
import { Button } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';
import { colors, hairline, radius, space } from '@/shared/ui/theme';
import { useCardDismissed, useEnablePush, usePushPermission } from '../hooks/use-push';
import { usePushDevice } from '../lib/push-device';

/**
 * Asked right after a booking, when a push is clearly useful, never at launch. Shown only
 * while the phone has not answered and the user has not said "Agora não" before; a no is
 * respected (Conta still has the switch).
 */
export function EnablePushCard() {
  const device = usePushDevice();
  const permission = usePushPermission();
  const enable = useEnablePush();
  const { dismissed, dismiss } = useCardDismissed();

  if (!device.supported || dismissed !== false) return null;
  if (enable.data === 'granted')
    return (
      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text>Avisos ativados.</Text>
      </View>
    );
  if (enable.data === 'denied')
    return (
      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text variant="muted">Tudo bem. Se mudar de ideia, os avisos ficam em Conta.</Text>
      </View>
    );
  if (permission.data !== 'undetermined') return null;

  return (
    <View style={styles.card}>
      <Text variant="heading">Quer saber de mudanças na hora?</Text>
      <Text variant="muted">
        Avisamos no celular se o barbeiro cancelar ou remarcar, e na hora do lembrete.
      </Text>
      <Button
        label="Ativar avisos no celular"
        loading={enable.isPending}
        onPress={() => enable.mutate()}
      />
      <Button label="Agora não" variant="ghost" onPress={dismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: colors.line,
    backgroundColor: colors.bar,
  },
});
