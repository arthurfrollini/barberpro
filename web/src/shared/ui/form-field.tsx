import { useId, type ReactNode } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from './field';

type ControlProps = { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string };

/** A label, the control, and its hint or error, wired together for screen readers. */
export function FormField({
  label,
  error,
  description,
  children,
}: {
  label: string;
  error?: string | undefined;
  description?: string;
  children: (control: ControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children({
        id,
        'aria-invalid': !!error,
        ...(error || description ? { 'aria-describedby': hintId } : {}),
      })}
      {error ? (
        <FieldError id={hintId}>{error}</FieldError>
      ) : (
        description && <FieldDescription id={hintId}>{description}</FieldDescription>
      )}
    </Field>
  );
}

export function FormError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
