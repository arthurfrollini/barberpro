import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatBRL } from '@/shared/lib/money';
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
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/page-header';
import { EmptyState, ErrorState, PageSkeleton } from '@/shared/ui/states';
import type { Service } from '../api/services';
import { ServiceDialog } from '../components/service-dialog';
import { useArchiveService, useMyServices } from '../hooks/use-services';

export function ServicesPage() {
  const services = useMyServices();
  const archive = useArchiveService();
  // undefined: closed; null: creating; a service: editing it
  const [editing, setEditing] = useState<Service | null | undefined>(undefined);

  return (
    <>
      <PageHeader
        title="Serviços"
        description="O que os clientes podem agendar com você, com preço e duração."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus /> Novo serviço
          </Button>
        }
      />
      {services.isPending ? (
        <PageSkeleton />
      ) : services.isError ? (
        <ErrorState error={services.error} onRetry={() => services.refetch()} />
      ) : services.data.length === 0 ? (
        <EmptyState title="Nenhum serviço ainda">
          Crie o primeiro para os clientes poderem agendar com você.
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {services.data.map((service) => (
            <li
              key={service.id}
              aria-label={service.name}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="font-display text-lg">{service.name}</p>
                {service.description && (
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                )}
                <p className="mt-1 text-sm tabular-nums">
                  {formatBRL(service.priceCents)}, {service.durationMinutes} min
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(service)}>
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Arquivar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Arquivar {service.name}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Clientes não poderão mais agendar {service.name}. Agendamentos já feitos
                        continuam.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          archive.mutate(service.id, {
                            onSuccess: () => toast.success('Serviço arquivado'),
                          })
                        }
                      >
                        Arquivar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing !== undefined && (
        <ServiceDialog
          key={editing?.id ?? 'new'}
          service={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
