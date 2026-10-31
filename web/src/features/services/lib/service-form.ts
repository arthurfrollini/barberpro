import { z } from 'zod';
import { LIMITS } from '@/shared/lib/limits';
import { parseBRL } from '@/shared/lib/money';
import type { Service } from '../api/services';

const { min, max, step } = LIMITS.duration;

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do serviço.')
    .max(LIMITS.serviceName, `Use até ${LIMITS.serviceName} caracteres.`),
  description: z
    .string()
    .trim()
    .max(LIMITS.serviceDescription, `Use até ${LIMITS.serviceDescription} caracteres.`),
  price: z.string().transform((value, ctx) => {
    const cents = parseBRL(value);
    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Use um valor como 45 ou 45,50.' });
      return z.NEVER;
    }
    return cents;
  }),
  duration: z.string().transform((value, ctx) => {
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes < min || minutes > max || minutes % step !== 0) {
      ctx.addIssue({ code: 'custom', message: 'De 5 a 480 minutos, de 5 em 5.' });
      return z.NEVER;
    }
    return minutes;
  }),
});

export type ServiceFormInput = z.input<typeof serviceSchema>;
export type ServiceFormOutput = z.output<typeof serviceSchema>;

export const emptyService: ServiceFormInput = {
  name: '',
  description: '',
  price: '',
  duration: '30',
};

/** What the form shows for an existing service: reais with a comma, as people type them. */
export const formValues = (service: Service): ServiceFormInput => ({
  name: service.name,
  description: service.description,
  price: (service.priceCents / 100).toFixed(2).replace('.', ','),
  duration: String(service.durationMinutes),
});

/** The fields of an edit that differ from the service as it is, in the API's terms. */
export function changes(service: Service, values: ServiceFormOutput) {
  const next = {
    name: values.name,
    description: values.description,
    priceCents: values.price,
    durationMinutes: values.duration,
  };
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => service[key as keyof typeof next] !== value),
  ) as Partial<typeof next>;
}
