import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from '@/shared/ui/button';
import { FormError, FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { useInviteBarber } from '../hooks/use-team';

const schema = z.object({
  email: z.string().trim().min(1, 'Informe o email.').pipe(z.email('Email inválido.')),
});

// answers about the email itself go under the field
const FIELD_CODES = new Set(['INVALID_EMAIL', 'INVITE_ALREADY_SENT', 'ALREADY_A_BARBER']);

export function InviteForm() {
  const invite = useInviteBarber();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    try {
      await invite.mutateAsync(email);
      toast.success(`Convite enviado para ${email}`);
      form.reset();
    } catch (error) {
      const code = isApiError(error) ? error.code : undefined;
      form.setError(code && FIELD_CODES.has(code) ? 'email' : 'root', {
        message: messageFor(code),
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-3">
      <FormError message={errors.root?.message} />
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-64 flex-1">
          <FormField
            label="Email do barbeiro"
            error={errors.email?.message}
            description="O convite chega por email e vale por 7 dias."
          >
            {(control) => (
              <Input {...control} type="email" autoComplete="off" {...form.register('email')} />
            )}
          </FormField>
        </div>
        <Button type="submit" className="mt-6" disabled={isSubmitting}>
          Enviar convite
        </Button>
      </div>
    </form>
  );
}
