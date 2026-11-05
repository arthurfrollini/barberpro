import { useLocalSearchParams } from 'expo-router';
import { AppointmentScreen } from '@/features/appointments/screens/appointment-screen';

export default function AppointmentRoute() {
  const { id, novo, remarcado } = useLocalSearchParams<{
    id: string;
    novo?: string;
    remarcado?: string;
  }>();
  return <AppointmentScreen id={id} notice={novo ? 'booked' : remarcado ? 'moved' : undefined} />;
}
