import { zodResolver } from '@hookform/resolvers/zod';
import { CopyCheck, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { AgendaAppointment } from '@/features/agenda/api/agenda';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';
import type { MySchedule } from '../api/schedule';
import { useSetWeeklySchedule } from '../hooks/use-schedule';
import { dayName, fromForm, toForm, weekSchema, type WeekForm } from '../lib/weekly-form';
import { CanceledDialog } from './canceled-list';

type Form = UseFormReturn<WeekForm>;

function DayRow({ form, index, onCopy }: { form: Form; index: number; onCopy: () => void }) {
  const weekday = form.getValues(`days.${index}.weekday`);
  const name = dayName(weekday);
  const working = useWatch({ control: form.control, name: `days.${index}.working` });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `days.${index}.intervals`,
  });
  const errors = form.formState.errors.days?.[index]?.intervals;

  return (
    <div
      role="group"
      aria-label={name}
      className="grid gap-4 border-b py-5 last:border-b-0 sm:grid-cols-[10rem_1fr]"
    >
      <div className="flex items-center gap-3 self-start pt-1.5">
        <Controller
          control={form.control}
          name={`days.${index}.working`}
          render={({ field }) => (
            <Switch
              checked={field.value}
              aria-label={`${name}: trabalha`}
              onCheckedChange={(on) => {
                field.onChange(on);
                if (on && fields.length === 0) append({ start: '09:00', end: '18:00' });
              }}
            />
          )}
        />
        <span className="font-display text-lg">{name}</span>
      </div>

      {working ? (
        <div className="flex flex-col gap-3">
          {fields.map((field, j) => {
            const error = errors?.[j]?.start?.message ?? errors?.[j]?.end?.message;
            const label = `${name}, intervalo ${j + 1}`;
            return (
              <div key={field.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`${label}, início`}
                    aria-invalid={!!errors?.[j]?.start}
                    inputMode="numeric"
                    placeholder="09:00"
                    className="w-24 tabular-nums"
                    {...form.register(`days.${index}.intervals.${j}.start`)}
                  />
                  <span className="text-muted-foreground">às</span>
                  <Input
                    aria-label={`${label}, fim`}
                    aria-invalid={!!errors?.[j]?.end}
                    inputMode="numeric"
                    placeholder="18:00"
                    className="w-24 tabular-nums"
                    {...form.register(`days.${index}.intervals.${j}.end`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover intervalo"
                    onClick={() => remove(j)}
                  >
                    <X />
                  </Button>
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
            );
          })}
          {fields.length === 0 && <p className="text-muted-foreground">Folga</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => append({ start: '', end: '' })}
            >
              <Plus /> Adicionar intervalo
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
              <CopyCheck /> Usar estes horários em todos os dias de trabalho
            </Button>
          </div>
        </div>
      ) : (
        <p className="pt-1.5 text-muted-foreground">Folga</p>
      )}
    </div>
  );
}

export function WeeklyHoursForm({
  schedule,
  timeZone,
}: {
  schedule: MySchedule;
  timeZone: string;
}) {
  const save = useSetWeeklySchedule();
  const [canceled, setCanceled] = useState<AgendaAppointment[]>([]);
  const form = useForm<WeekForm>({
    resolver: zodResolver(weekSchema),
    defaultValues: toForm(schedule.weekly),
  });
  const { isDirty, errors } = form.formState;

  const copyFrom = (source: number) => {
    const intervals = form.getValues(`days.${source}.intervals`);
    form.getValues('days').forEach((day, target) => {
      if (target !== source && day.working) {
        form.setValue(
          `days.${target}.intervals`,
          intervals.map((i) => ({ ...i })),
          { shouldDirty: true },
        );
      }
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await save.mutateAsync(fromForm(values));
      form.reset(toForm(result.weekly));
      toast.success('Horários salvos');
      setCanceled(result.canceledAppointments);
    } catch (error) {
      form.setError('root', { message: messageFor(isApiError(error) ? error.code : undefined) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="rounded-lg border bg-card/40 px-5">
        {form.getValues('days').map((day, index) => (
          <DayRow key={day.weekday} form={form} index={index} onCopy={() => copyFrom(index)} />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <FormError message={errors.root?.message} />
        <p className="max-w-prose text-sm text-muted-foreground">
          Agendamentos a 2 horas ou mais que ficarem fora dos novos horários são cancelados, e os
          clientes recebem um aviso.
        </p>
        <div>
          <Button type="submit" disabled={!isDirty || save.isPending}>
            Salvar horários
          </Button>
        </div>
      </div>
      <CanceledDialog appointments={canceled} timeZone={timeZone} onClose={() => setCanceled([])} />
    </form>
  );
}
