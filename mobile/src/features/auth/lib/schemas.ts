import { z } from 'zod';
import { LIMITS } from '@/shared/lib/limits';

const email = z.string().trim().min(1, 'Informe seu email.').pipe(z.email('Email inválido.'));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
});

export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Informe seu nome.')
  .max(LIMITS.userName, `Use até ${LIMITS.userName} caracteres.`);

const PASSWORD_RULE = 'A senha precisa ter de 8 a 128 caracteres.';

export const signUpSchema = z.object({
  name: nameSchema,
  email,
  password: z
    .string()
    .min(LIMITS.password.min, PASSWORD_RULE)
    .max(LIMITS.password.max, PASSWORD_RULE),
});
