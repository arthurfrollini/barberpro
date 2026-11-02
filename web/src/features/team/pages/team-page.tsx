import { toast } from 'sonner';
import type { MyShop } from '@/features/shop/api/shop';
import { useMyShop } from '@/features/shop/hooks/use-shop';
import { useRoles } from '@/features/roles/hooks/use-roles';
import { formatDayMonth, localDateOf } from '@/shared/lib/time';
import { toastError } from '@/shared/ui/toast-error';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorState, PageSkeleton } from '@/shared/ui/states';
import { InviteForm } from '../components/invite-form';
import { useRemoveBarber, useRevokeInvite } from '../hooks/use-team';

const STATUS = {
  PENDING: 'Pendente',
  ACCEPTED: 'Aceito',
  REVOKED: 'Revogado',
  EXPIRED: 'Expirado',
} as const;

function Barbers({ shop, myBarberId }: { shop: MyShop; myBarberId: string | undefined }) {
  const remove = useRemoveBarber();
  if (shop.barbers.length === 0) {
    return <p className="text-muted-foreground">Ninguém na equipe ainda. Convide alguém abaixo.</p>;
  }
  return (
    <ul aria-label="Barbeiros" className="flex flex-col divide-y rounded-lg border">
      {shop.barbers.map((barber) => {
        const me = barber.id === myBarberId;
        const label = me ? `${barber.name} (você)` : barber.name;
        return (
          <li key={barber.id} aria-label={label} className="flex items-center gap-4 px-5 py-3">
            <Avatar className="size-10">
              {barber.avatarUrl && <AvatarImage src={barber.avatarUrl} alt="" />}
              <AvatarFallback className="bg-secondary">{barber.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="flex-1">
              {barber.name}
              {me && <span className="text-muted-foreground"> (você)</span>}
            </span>
            {!me && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending && remove.variables === barber.id}
                  >
                    Remover
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover da equipe</AlertDialogTitle>
                    <AlertDialogDescription>
                      Remover {barber.name} da equipe? Os agendamentos de {barber.name} a 2 horas ou
                      mais são cancelados e os clientes avisados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() =>
                        remove.mutate(barber.id, {
                          onSuccess: () => toast.success(`${barber.name} saiu da equipe`),
                          onError: (error) => toastError(error),
                        })
                      }
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Invites({ shop }: { shop: MyShop }) {
  const revoke = useRevokeInvite();
  const invites = [...shop.invites].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (invites.length === 0) return null;
  return (
    <ul aria-label="Convites" className="flex flex-col divide-y rounded-lg border">
      {invites.map((invite) => (
        <li
          key={invite.id}
          aria-label={invite.email}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"
        >
          <span className="min-w-0 flex-1 truncate">{invite.email}</span>
          <Badge variant={invite.status === 'PENDING' ? 'default' : 'secondary'}>
            {STATUS[invite.status]}
          </Badge>
          {invite.status === 'PENDING' && (
            <>
              <span className="text-sm text-muted-foreground">
                expira em {formatDayMonth(localDateOf(invite.expiresAt, shop.timezone))}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={revoke.isPending}
                onClick={() =>
                  revoke.mutate(invite.id, {
                    onSuccess: () => toast.success('Convite revogado'),
                    onError: (error) => toastError(error),
                  })
                }
              >
                Revogar
              </Button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function TeamPage() {
  const shop = useMyShop();
  const roles = useRoles();
  return (
    <>
      <PageHeader
        title="Equipe"
        description="Quem atende na sua barbearia, e os convites enviados."
      />
      {shop.isPending ? (
        <PageSkeleton />
      ) : shop.isError ? (
        <ErrorState error={shop.error} onRetry={() => shop.refetch()} />
      ) : shop.data ? (
        <div className="flex flex-col gap-12">
          <section aria-labelledby="barbers-title" className="flex flex-col gap-4">
            <h2 id="barbers-title" className="text-xl">
              Barbeiros
            </h2>
            <Barbers shop={shop.data} myBarberId={roles.data?.barber?.id} />
          </section>
          <section aria-labelledby="invites-title" className="flex flex-col gap-4">
            <h2 id="invites-title" className="text-xl">
              Convidar
            </h2>
            <InviteForm />
            <Invites shop={shop.data} />
          </section>
        </div>
      ) : null}
    </>
  );
}
