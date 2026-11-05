import { useLocalSearchParams } from 'expo-router';
import { ShopScreen } from '@/features/shops/screens/shop-screen';

export default function ShopRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShopScreen id={id} />;
}
