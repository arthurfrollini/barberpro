import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import { colors, fonts } from './theme';

type StackOptions = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;

/** The header every stacked screen gets: the bar color, slab title, orange back button. */
export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.bar },
  headerTintColor: colors.accent,
  headerTitleStyle: { fontFamily: fonts.slab, color: colors.text },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.ground },
} satisfies Exclude<StackOptions, (...args: never[]) => unknown>;
