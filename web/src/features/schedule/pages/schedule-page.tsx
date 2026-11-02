import { currentShop, useRoles } from '@/features/roles/hooks/use-roles';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorState, PageSkeleton } from '@/shared/ui/states';
import { DaysOff } from '../components/days-off';
import { WeeklyHoursForm } from '../components/weekly-hours-form';
import { useMySchedule } from '../hooks/use-schedule';

export function SchedulePage() {
  const roles = useRoles();
  const timeZone = currentShop(roles.data!)!.timezone;
  const schedule = useMySchedule();
  return (
    <>
      <PageHeader
        title="Horários"
        description="Os horários em que os clientes podem agendar com você, no fuso da barbearia."
      />
      {schedule.isPending ? (
        <PageSkeleton />
      ) : schedule.isError ? (
        <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} />
      ) : (
        <div className="flex flex-col gap-12">
          <section aria-labelledby="weekly-title" className="flex flex-col gap-4">
            <h2 id="weekly-title" className="text-xl">
              Semana
            </h2>
            <WeeklyHoursForm schedule={schedule.data} timeZone={timeZone} />
          </section>
          <DaysOff schedule={schedule.data} timeZone={timeZone} />
        </div>
      )}
    </>
  );
}
