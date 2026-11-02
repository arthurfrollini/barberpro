import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { FormError, FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import type { Service } from '../api/services';
import { useCreateService, useUpdateService } from '../hooks/use-services';
import {
  changes,
  emptyService,
  formValues,
  serviceSchema,
  type ServiceFormInput,
  type ServiceFormOutput,
} from '../lib/service-form';

/** Creates a service, or edits `service` when given. Remounted per open, so it starts clean. */
export function ServiceDialog({
  barberId,
  service,
  onClose,
}: {
  barberId: string;
  service: Service | null;
  onClose: () => void;
}) {
  const create = useCreateService(barberId);
  const update = useUpdateService(barberId);
  const form = useForm<ServiceFormInput, unknown, ServiceFormOutput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: service ? formValues(service) : emptyService,
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (service) {
        const input = changes(service, values);
        if (Object.keys(input).length) await update.mutateAsync({ id: service.id, input });
        toast.success('Serviço salvo');
      } else {
        await create.mutateAsync({
          name: values.name,
          description: values.description,
          priceCents: values.price,
          durationMinutes: values.duration,
        });
        toast.success('Serviço criado');
      }
      onClose();
    } catch (error) {
      form.setError('root', { message: messageFor(isApiError(error) ? error.code : undefined) });
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
          <DialogDescription>
            {service
              ? 'Agendamentos já feitos mantêm o preço e a duração de quando foram marcados.'
              : 'Os clientes escolhem entre os seus serviços ao agendar.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormError message={errors.root?.message} />
          <FormField label="Nome" error={errors.name?.message}>
            {(control) => <Input {...control} {...form.register('name')} />}
          </FormField>
          <FormField label="Descrição" error={errors.description?.message}>
            {(control) => <Textarea {...control} rows={3} {...form.register('description')} />}
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Preço (R$)" error={errors.price?.message}>
              {(control) => (
                <Input
                  {...control}
                  inputMode="decimal"
                  placeholder="45,00"
                  {...form.register('price')}
                />
              )}
            </FormField>
            <FormField label="Duração (minutos)" error={errors.duration?.message}>
              {(control) => (
                <Input
                  {...control}
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  {...form.register('duration')}
                />
              )}
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {service ? 'Salvar' : 'Criar serviço'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
