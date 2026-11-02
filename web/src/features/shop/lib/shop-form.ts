import { z } from 'zod';
import { LIMITS } from '@/shared/lib/limits';
import type { ShopFields } from '../api/shop';

/** Brazil's zones, by what people call them. The API accepts any IANA zone. */
export const TIME_ZONES = [
  { value: 'America/Sao_Paulo', label: 'Horário de Brasília' },
  { value: 'America/Manaus', label: 'Amazonas (1 hora a menos)' },
  { value: 'America/Cuiaba', label: 'Mato Grosso (1 hora a menos)' },
  { value: 'America/Campo_Grande', label: 'Mato Grosso do Sul (1 hora a menos)' },
  { value: 'America/Porto_Velho', label: 'Rondônia (1 hora a menos)' },
  { value: 'America/Boa_Vista', label: 'Roraima (1 hora a menos)' },
  { value: 'America/Rio_Branco', label: 'Acre (2 horas a menos)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (1 hora a mais)' },
];

/** "−23,56" or "-23.56" both read as a number; anything else is not one. */
const decimal = (text: string) => {
  const value = Number(text.trim().replace(',', '.').replace('−', '-'));
  return text.trim() === '' || Number.isNaN(value) ? null : value;
};

const coordinate = (limit: number, message: string) =>
  z.string().transform((text, ctx) => {
    const value = decimal(text);
    if (value === null || Math.abs(value) > limit) {
      ctx.addIssue({ code: 'custom', message });
      return z.NEVER;
    }
    return value;
  });

export function shopSchema(now: Date = new Date()) {
  const thisYear = now.getFullYear();
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Informe o nome da barbearia.')
      .max(LIMITS.shopName, `Use até ${LIMITS.shopName} caracteres.`),
    description: z
      .string()
      .trim()
      .max(LIMITS.shopDescription, `Use até ${LIMITS.shopDescription} caracteres.`),
    foundedYear: z.string().transform((text, ctx) => {
      const year = Number(text);
      if (!Number.isInteger(year) || year < 1900 || year > thisYear) {
        ctx.addIssue({ code: 'custom', message: `Use um ano entre 1900 e ${thisYear}.` });
        return z.NEVER;
      }
      return year;
    }),
    address: z
      .string()
      .trim()
      .min(1, 'Informe o endereço.')
      .max(LIMITS.address, `Use até ${LIMITS.address} caracteres.`),
    latitude: coordinate(90, 'A latitude vai de -90 a 90.'),
    longitude: coordinate(180, 'A longitude vai de -180 a 180.'),
    timezone: z.string().min(1),
    logo: z.object({ fileId: z.string().nullable().optional(), url: z.string().nullable() }),
  });
}

export type ShopFormInput = z.input<ReturnType<typeof shopSchema>>;
export type ShopFormOutput = z.output<ReturnType<typeof shopSchema>>;

export const emptyShop: ShopFormInput = {
  name: '',
  description: '',
  foundedYear: '',
  address: '',
  latitude: '',
  longitude: '',
  timezone: 'America/Sao_Paulo',
  logo: { url: null },
};

export const shopValues = (shop: ShopFields): ShopFormInput => ({
  name: shop.name,
  description: shop.description,
  foundedYear: String(shop.foundedYear),
  address: shop.address,
  latitude: String(shop.latitude),
  longitude: String(shop.longitude),
  timezone: shop.timezone,
  logo: { url: shop.logoUrl ?? null },
});

/** The form's output in the API's terms; the logo only when it changed. */
export function toInput(values: ShopFormOutput) {
  const { logo, ...rest } = values;
  return { ...rest, ...(logo.fileId !== undefined ? { logoFileId: logo.fileId } : {}) };
}

/** For an edit: only the fields that differ from the shop as it is. */
export function changedFields(shop: ShopFields, values: ShopFormOutput) {
  const input = toInput(values);
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => key === 'logoFileId' || shop[key as keyof ShopFields] !== value,
    ),
  ) as Partial<ReturnType<typeof toInput>>;
}
