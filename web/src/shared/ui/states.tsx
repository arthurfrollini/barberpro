import { RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from './button';
import { Skeleton } from './skeleton';

/** A failed query: what went wrong, in Portuguese, and a way to try again. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 p-5"
    >
      <p>{messageFor(isApiError(error) ? error.code : undefined)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw /> Tentar de novo
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-8">
      <p className="font-display text-lg">{title}</p>
      {children && <div className="mt-2 text-muted-foreground">{children}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex flex-col gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-80 max-w-full" />
      <Skeleton className="mt-4 h-40 w-full" />
    </div>
  );
}
