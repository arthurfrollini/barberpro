import { StyleSheet } from 'react-native';

// The brand from the logo, as in the dashboard: plum-grey ground, one orange accent, warm
// off-white text. Dark only.
export const colors = {
  ground: '#312E38',
  bar: '#28262E',
  raised: '#3E3B47',
  line: '#4A4655',
  accent: '#FF9000',
  onAccent: '#28262E',
  text: '#F4EDE8',
  muted: '#B3AEA9',
  error: '#FF8A7A',
} as const;

export const fonts = {
  slab: 'RobotoSlab_600SemiBold',
  slabRegular: 'RobotoSlab_400Regular',
  body: 'Archivo_400Regular',
  bodyMedium: 'Archivo_500Medium',
  bodySemiBold: 'Archivo_600SemiBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const hairline = StyleSheet.hairlineWidth;
