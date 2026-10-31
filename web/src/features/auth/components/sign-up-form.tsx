import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { LIMITS } from '@/shared/lib/limits';
import { Button } from '@/shared/ui/button';
import { FormError, FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { useSignUp } from '../hooks/use-auth';
import { returnPath } from './return-path';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe seu nome.')
    .max(LIMITS.userName, `Use até ${LIMITS.userName} caracteres.`),
  email: z.string().trim().min(1, 'Informe seu email.').pipe(z.email('Email inválido.')),
  password: z
    .string()
    .min(LIMITS.password.min, 'A senha precisa de pelo menos 8 caracteres.')
    .max(LIMITS.password.max, 'A senha pode ter até 128 caracteres.'),
});

// errors the API attaches to one field; anything else shows above the form
const FIELD_ERRORS = {
  EMAIL_TAKEN: 'email',
  INVALID_EMAIL: 'email',
  INVALID_NAME: 'name',
} as const;

export function SignUpForm() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const signUp = useSignUp();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signUp.mutateAsync(values);
      navigate(returnPath(search), { replace: true });
    } catch (error) {
      const code = isApiError(error) ? error.code : undefined;
      const field =
        code && code in FIELD_ERRORS ? FIELD_ERRORS[code as keyof typeof FIELD_ERRORS] : 'root';
      form.setError(field, { message: messageFor(code) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormError message={errors.root?.message} />
      <FormField label="Nome" error={errors.name?.message}>
        {(control) => <Input {...control} autoComplete="name" {...form.register('name')} />}
      </FormField>
      <FormField label="Email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} type="email" autoComplete="email" {...form.register('email')} />
        )}
      </FormField>
      <FormField
        label="Senha"
        error={errors.password?.message}
        description="Pelo menos 8 caracteres."
      >
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
          />
        )}
      </FormField>
      <Button type="submit" size="lg" disabled={signUp.isPending}>
        Criar conta
      </Button>
    </form>
  );
}
