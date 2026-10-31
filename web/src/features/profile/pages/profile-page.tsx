import { useMe } from '@/features/auth/hooks/use-auth';
import { useRoles } from '@/features/roles/hooks/use-roles';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorState, PageSkeleton } from '@/shared/ui/states';
import { BarberProfileForm } from '../components/barber-profile-form';
import { NameForm } from '../components/name-form';

export function ProfilePage() {
  const me = useMe();
  const roles = useRoles();
  const barber = roles.data?.barber;
  return (
    <>
      <PageHeader title="Perfil" />
      {me.isPending ? (
        <PageSkeleton />
      ) : me.isError ? (
        <ErrorState error={me.error} onRetry={() => me.refetch()} />
      ) : (
        <div className="flex flex-col gap-12">
          <section aria-labelledby="account-title" className="flex flex-col gap-4">
            <h2 id="account-title" className="text-xl">
              Seus dados
            </h2>
            <NameForm me={me.data} />
          </section>
          {barber && (
            <section aria-labelledby="barber-title" className="flex flex-col gap-4">
              <h2 id="barber-title" className="text-xl">
                Perfil de barbeiro
              </h2>
              <BarberProfileForm barber={barber} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
