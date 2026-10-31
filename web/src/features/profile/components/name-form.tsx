import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { Me } from '@/features/auth/api/auth';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { LIMITS } from '@/shared/lib/limits';
import { Button } from '@/shared/ui/button';
import { FormError, FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { useUpdateName } from '../hooks/use-profile';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe seu nome.')
    .max(LIMITS.userName, `Use até ${LIMITS.userName} caracteres.`),
});

export function NameForm({ me }: { me: Me }) {
  const update = useUpdateName();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: me.name } });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async ({ name }) => {
    try {
      const saved = await update.mutateAsync(name);
      form.reset({ name: saved.name });
      toast.success('Nome salvo');
    } catch (error) {
      form.setError('root', { message: messageFor(isApiError(error) ? error.code : undefined) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-5">
      <FormError message={errors.root?.message} />
      <FormField label="Nome" error={errors.name?.message}>
        {(control) => <Input {...control} autoComplete="name" {...form.register('name')} />}
      </FormField>
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Email</span>
        <span>{me.email}</span>
      </div>
      <div>
        <Button type="submit" disabled={!isDirty || update.isPending}>
          Salvar nome
        </Button>
      </div>
    </form>
  );
}
