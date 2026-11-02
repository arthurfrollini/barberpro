import { useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useRoles } from '@/features/roles/hooks/use-roles';
import { isApiError, session } from '@/shared/api';
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
  const roles = useRoles();
  const errorCode = isApiError(accept.error) ? accept.error.code : undefined;
  const errorMessage =
    errorCode === 'ALREADY_A_BARBER' ? 'Você já atende em uma barbearia.' : messageFor(errorCode);

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
        {roles.data?.shop && !roles.data.barber && (
          <p className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
            Você é dono da {roles.data.shop.name}. Ao aceitar, você passa a atender na barbearia do
            convite, não na sua.
          </p>
        )}
        {accept.isError && (
          <div className="flex flex-col items-start gap-2">
            <FormError message={errorMessage} />
            {errorCode === 'INVITE_EMAIL_MISMATCH' && (
              // ending the session this way keeps the page (and the code) for after sign-in
              <Button type="button" variant="outline" size="sm" onClick={() => session.clear()}>
                Entrar com outro email
              </Button>
            )}
          </div>
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
