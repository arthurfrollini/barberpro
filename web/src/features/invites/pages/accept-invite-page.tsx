import { useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { isApiError } from '@/shared/api';
import { messageFor } from '@/shared/lib/error-messages';
import { Button } from '@/shared/ui/button';
import { FormError } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageHeader } from '@/shared/ui/page-header';
import { useAcceptInvite } from '../hooks/use-accept-invite';

/** Opened from the invite email (/convite?codigo=...), or by typing the code. */
export function AcceptInvitePage() {
  const codeId = useId();
  const [search] = useSearchParams();
  const [code, setCode] = useState(search.get('codigo') ?? '');
  const accept = useAcceptInvite();
  const navigate = useNavigate();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    accept.mutate(code.trim(), {
      onSuccess: (barber) => {
        toast.success(`Bem-vindo à equipe da ${barber.barbershop.name}`);
        navigate('/agenda', { replace: true });
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Aceitar convite"
        description="Use o código do email do convite. Ele vale para o email com que você entrou."
      />
      <form onSubmit={submit} className="flex max-w-md flex-col gap-5">
        {accept.isError && (
          <FormError
            message={messageFor(isApiError(accept.error) ? accept.error.code : undefined)}
          />
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor={codeId}>Código do convite</Label>
          <Input
            id={codeId}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            spellCheck={false}
          />
        </div>
        <div>
          <Button type="submit" disabled={!code.trim() || accept.isPending}>
            Aceitar convite
          </Button>
        </div>
      </form>
    </>
  );
}
