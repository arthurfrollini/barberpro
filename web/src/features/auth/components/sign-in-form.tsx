import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from '@/shared/ui/button';
import { FormError, FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { isApiError } from '@/shared/api';
import { useSignIn } from '../hooks/use-auth';
import { returnPath } from './return-path';

const schema = z.object({
  email: z.string().trim().min(1, 'Informe seu email.').pipe(z.email('Email inválido.')),
  password: z.string().min(1, 'Informe sua senha.'),
});

export function SignInForm() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const signIn = useSignIn();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signIn.mutateAsync(values);
      navigate(returnPath(search), { replace: true });
    } catch (error) {
      form.setError('root', { message: messageFor(isApiError(error) ? error.code : undefined) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormError message={errors.root?.message} />
      <FormField label="Email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} type="email" autoComplete="email" {...form.register('email')} />
        )}
      </FormField>
      <FormField label="Senha" error={errors.password?.message}>
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
        )}
      </FormField>
      <Button type="submit" size="lg" disabled={signIn.isPending}>
        Entrar
      </Button>
    </form>
  );
}
