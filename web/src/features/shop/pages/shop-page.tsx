import { toast } from 'sonner';
import { useRoles } from '@/features/roles/hooks/use-roles';
import { Button } from '@/shared/ui/button';
import { toastError } from '@/shared/ui/toast-error';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorState, PageSkeleton } from '@/shared/ui/states';
import { ShopForm } from '../components/shop-form';
import { useBecomeBarber, useMyShop } from '../hooks/use-shop';

function JoinAsBarber() {
  const join = useBecomeBarber();
  return (
    <section
      aria-labelledby="join-title"
      className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/5 p-5"
    >
      <div className="max-w-prose">
        <h2 id="join-title" className="text-lg">
          Você também atende?
        </h2>
        <p className="text-sm text-muted-foreground">
          Entre na equipe como barbeiro para ter agenda, horários e serviços.
        </p>
      </div>
      <Button
        disabled={join.isPending}
        onClick={() =>
          join.mutate(undefined, {
            onSuccess: () => toast.success('Pronto. Configure seus horários e serviços.'),
            onError: (error) =>
              toastError(error, { ALREADY_A_BARBER: 'Você já atende em uma barbearia.' }),
          })
        }
      >
        Atender também
      </Button>
    </section>
  );
}

export function ShopPage() {
  const shop = useMyShop();
  const roles = useRoles();
  return (
    <>
      <PageHeader title="Barbearia" description="A página que os clientes veem ao procurar você." />
      {roles.data && !roles.data.barber && <JoinAsBarber />}
      {shop.isPending ? (
        <PageSkeleton />
      ) : shop.isError ? (
        <ErrorState error={shop.error} onRetry={() => shop.refetch()} />
      ) : shop.data ? (
        <ShopForm key={shop.data.id} shop={shop.data} />
      ) : null}
    </>
  );
}
