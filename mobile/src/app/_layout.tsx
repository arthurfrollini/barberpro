import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { RobotoSlab_400Regular } from '@expo-google-fonts/roboto-slab/400Regular';
import { RobotoSlab_600SemiBold } from '@expo-google-fonts/roboto-slab/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { api, ApiProvider, createQueryClient, refetchOnForeground, session } from '@/shared/api';
import { PushListener } from '@/features/push/components/push-listener';
import { showNotificationsInForeground } from '@/features/push/lib/push-device';
import { stackScreenOptions } from '@/shared/ui/navigation';

void SplashScreen.preventAutoHideAsync();
showNotificationsInForeground();

const queryClient = createQueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    RobotoSlab_400Regular,
    RobotoSlab_600SemiBold,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
  });
  // the session is read from the Keychain once, before the first screen decides anything
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    void session.hydrate().finally(() => setHydrated(true));
  }, []);
  useEffect(() => refetchOnForeground(), []);

  const ready = (fontsLoaded || fontError !== null) && hydrated;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  return (
    <ApiProvider api={api} session={session} queryClient={queryClient}>
      <PushListener />
      <StatusBar style="light" />
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ApiProvider>
  );
}
