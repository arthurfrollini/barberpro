import { zodResolver } from '@hookform/resolvers/zod';
import { LocateFixed } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ImageField } from '@/features/uploads/components/image-field';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from '@/shared/ui/button';
import { FormError, FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import type { ShopFields } from '../api/shop';
import { useCreateShop, useUpdateShop } from '../hooks/use-shop';
import {
  TIME_ZONES,
  changedFields,
  emptyShop,
  shopSchema,
  shopValues,
  toInput,
  type ShopFormInput,
  type ShopFormOutput,
} from '../lib/shop-form';

/** GeolocationPositionError codes: 1 permission denied, 2 position unavailable, 3 timeout. */
const LOCATION_ERRORS: Record<number, string> = {
  1: 'O navegador bloqueou a localização. Libere nas permissões do site ou preencha à mão.',
  2: 'O aparelho não conseguiu achar sua localização. Preencha à mão.',
  3: 'A localização demorou demais. Tente de novo ou preencha à mão.',
};

const selectClass =
  'h-9 w-full rounded-md border border-input bg-input px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

/** Creates a shop (`onCreated` gets its id), or edits `shop` when given. */
export function ShopForm({
  shop,
  onCreated,
}: {
  shop?: ShopFields;
  onCreated?: (shopId: string) => void;
}) {
  const create = useCreateShop();
  const update = useUpdateShop();
  const schema = useMemo(() => shopSchema(), []);
  const form = useForm<ShopFormInput, unknown, ShopFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: shop ? shopValues(shop) : emptyShop,
  });
  const { errors, isDirty, isSubmitting } = form.formState;
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const zones =
    shop && !TIME_ZONES.some((z) => z.value === shop.timezone)
      ? [{ value: shop.timezone, label: shop.timezone }, ...TIME_ZONES]
      : TIME_ZONES;

  const locate = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Este navegador não informa a localização. Preencha à mão.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const options = { shouldDirty: true, shouldValidate: true };
        form.setValue('latitude', coords.latitude.toFixed(6), options);
        form.setValue('longitude', coords.longitude.toFixed(6), options);
      },
      ({ code }) => {
        setLocating(false);
        setLocationError(LOCATION_ERRORS[code] ?? LOCATION_ERRORS[2]!);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (shop) {
        const input = changedFields(shop, values);
        const saved = await update.mutateAsync({ id: shop.id, input });
        form.reset(shopValues(saved));
        toast.success('Barbearia salva');
      } else {
        const created = await create.mutateAsync(toInput(values));
        toast.success('Barbearia criada');
        onCreated?.(created.id);
      }
    } catch (error) {
      form.setError('root', { message: messageFor(isApiError(error) ? error.code : undefined) });
    }
  });

  return (
    <form
      aria-label="Dados da barbearia"
      onSubmit={onSubmit}
      noValidate
      className="flex max-w-2xl flex-col gap-6"
    >
      <Controller
        control={form.control}
        name="logo"
        render={({ field }) => (
          <ImageField
            label="Logo"
            shape="square"
            url={field.value.url}
            onChange={(next) => field.onChange(next)}
            onUploadingChange={setUploading}
          />
        )}
      />
      <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
        <FormField label="Nome" error={errors.name?.message}>
          {(control) => <Input {...control} {...form.register('name')} />}
        </FormField>
        <FormField label="Ano de fundação" error={errors.foundedYear?.message}>
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              placeholder="2012"
              {...form.register('foundedYear')}
            />
          )}
        </FormField>
      </div>
      <FormField
        label="Descrição"
        error={errors.description?.message}
        description="Aparece na página da barbearia para os clientes."
      >
        {(control) => <Textarea {...control} rows={3} {...form.register('description')} />}
      </FormField>
      <FormField label="Endereço" error={errors.address?.message}>
        {(control) => (
          <Input {...control} autoComplete="street-address" {...form.register('address')} />
        )}
      </FormField>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">Localização no mapa</legend>
        <p className="text-sm text-muted-foreground">
          Os clientes encontram as barbearias mais perto deles por estas coordenadas.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Latitude" error={errors.latitude?.message}>
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                placeholder="-23.5614"
                {...form.register('latitude')}
              />
            )}
          </FormField>
          <FormField label="Longitude" error={errors.longitude?.message}>
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                placeholder="-46.6559"
                {...form.register('longitude')}
              />
            )}
          </FormField>
        </div>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating}>
            <LocateFixed /> {locating ? 'Localizando…' : 'Usar minha localização'}
          </Button>
        </div>
        {locationError && (
          <p role="alert" className="text-sm text-destructive">
            {locationError}
          </p>
        )}
      </fieldset>

      <FormField
        label="Fuso horário"
        error={errors.timezone?.message}
        description="Os horários de trabalho e a agenda seguem este fuso."
      >
        {(control) => (
          <select {...control} className={selectClass} {...form.register('timezone')}>
            {zones.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
        )}
      </FormField>

      {/* next to the button, so a long form on a phone still shows why the save failed */}
      <FormError message={errors.root?.message} />
      <div>
        <Button type="submit" disabled={(shop && !isDirty) || uploading || isSubmitting}>
          {shop ? 'Salvar' : 'Criar barbearia'}
        </Button>
      </div>
    </form>
  );
}
