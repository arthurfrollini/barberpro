import { useLocalSearchParams } from 'expo-router';
import { RescheduleScreen } from '@/features/appointments/screens/reschedule-screen';

export default function RescheduleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RescheduleScreen id={id} />;
}
