import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { BarberProfile } from '@/features/workspaces/lib/workspaces';
import { ImageField } from '@/features/uploads/components/image-field';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { LIMITS } from '@/shared/lib/limits';
import { Button } from '@/shared/ui/button';
import { FormError, FormField } from '@/shared/ui/form-field';
import { Textarea } from '@/shared/ui/textarea';
import { useUpdateBarberProfile } from '../hooks/use-profile';

const schema = z.object({
  bio: z.string().trim().max(LIMITS.bio, `Use até ${LIMITS.bio} caracteres.`),
  // undefined: photo untouched; null: remove it; a string: the uploaded file
  photo: z.object({ fileId: z.string().nullable().optional(), url: z.string().nullable() }),
});

type Values = z.infer<typeof schema>;

export function BarberProfileForm({ barber }: { barber: BarberProfile }) {
  const update = useUpdateBarberProfile(barber.id);
  const defaults: Values = { bio: barber.bio, photo: { url: barber.avatarUrl ?? null } };
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { errors, isDirty, dirtyFields } = form.formState;
  const bio = useWatch({ control: form.control, name: 'bio' });
  const [uploading, setUploading] = useState(false);

  const onSubmit = form.handleSubmit(async (values) => {
    const input = {
      ...(dirtyFields.bio ? { bio: values.bio } : {}),
      ...(values.photo.fileId !== undefined ? { avatarFileId: values.photo.fileId } : {}),
    };
    try {
      const saved = await update.mutateAsync(input);
      form.reset({ bio: saved.bio, photo: { url: saved.avatarUrl ?? null } });
      toast.success('Perfil salvo');
    } catch (error) {
      form.setError('root', { message: messageFor(isApiError(error) ? error.code : undefined) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-6">
      <FormError message={errors.root?.message} />
      <Controller
        control={form.control}
        name="photo"
        render={({ field }) => (
          <ImageField
            label="Foto"
            url={field.value.url}
            onChange={(next) => field.onChange(next)}
            onUploadingChange={setUploading}
          />
        )}
      />
      <FormField
        label="Bio"
        error={errors.bio?.message}
        description="Aparece para os clientes na página da barbearia."
      >
        {(control) => <Textarea {...control} rows={4} {...form.register('bio')} />}
      </FormField>
      <p className="-mt-4 text-right text-xs text-muted-foreground tabular-nums">
        {bio.length}/{LIMITS.bio}
      </p>
      <div>
        <Button type="submit" disabled={!isDirty || uploading || update.isPending}>
          Salvar perfil
        </Button>
      </div>
    </form>
  );
}
