import type { Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LinkButton } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';
import { space } from '@/shared/ui/theme';
import { returnPathWith } from '../lib/return-path';

/** What a tab is for when nobody is signed in, and the way in. `back` is where to return. */
export function SignedOut({ title, body, back }: { title: string; body: string; back: string }) {
  return (
    <View style={styles.box}>
      <Text variant="heading">{title}</Text>
      <Text variant="muted">{body}</Text>
      <LinkButton href={returnPathWith('/entrar', back) as Href} label="Entrar" />
      <LinkButton
        href={returnPathWith('/criar-conta', back) as Href}
        label="Criar conta"
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexGrow: 1, justifyContent: 'center', gap: space.md },
});
