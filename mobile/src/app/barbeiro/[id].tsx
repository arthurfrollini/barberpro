import { useLocalSearchParams } from 'expo-router';
import { BarberScreen } from '@/features/shops/screens/barber-screen';

export default function BarberRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BarberScreen id={id} />;
}
