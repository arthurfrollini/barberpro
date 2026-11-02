import { Mail, Store } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useActiveWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { choose } from '@/features/workspaces/lib/choice';
import { landingPath } from '@/features/workspaces/lib/workspaces';
import { ShopForm } from '@/features/shop/components/shop-form';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/page-header';

const choice =
  'flex flex-col items-start gap-2 rounded-lg border bg-card/40 p-5 text-left transition-colors hover:border-primary/60 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

/** For someone signed in who neither owns a shop nor barbers anywhere yet. */
export function StartPage() {
  const { active } = useActiveWorkspace();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  if (active && !creating) return <Navigate to={landingPath(active)} replace />;

  return (
    <>
      <PageHeader
        title="Começar"
        description="A dashboard é para quem tem uma barbearia ou atende em uma. Como você chegou aqui?"
      />
      {creating ? (
        <section aria-labelledby="new-shop-title" className="flex flex-col gap-6">
          <h2 id="new-shop-title" className="text-xl">
            Sua barbearia
          </h2>
          <ShopForm
            onCreated={(shopId) => {
              choose(shopId);
              navigate('/barbearia', { replace: true });
            }}
          />
          <div>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Voltar
            </Button>
          </div>
        </section>
      ) : (
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <button
            type="button"
            className={choice}
            onClick={() => setCreating(true)}
            aria-labelledby="choice-shop"
            aria-describedby="choice-shop-text"
          >
            <Store aria-hidden className="size-6 text-primary" />
            <span id="choice-shop" className="font-display text-lg">
              Tenho uma barbearia
            </span>
            <span id="choice-shop-text" className="text-sm text-muted-foreground">
              Crie a página dela, convide sua equipe e atenda também, se quiser.
            </span>
          </button>
          <Link
            to="/convite"
            className={choice}
            aria-labelledby="choice-invite"
            aria-describedby="choice-invite-text"
          >
            <Mail aria-hidden className="size-6 text-primary" />
            <span id="choice-invite" className="font-display text-lg">
              Recebi um convite
            </span>
            <span id="choice-invite-text" className="text-sm text-muted-foreground">
              Use o código do email para entrar na equipe de uma barbearia.
            </span>
          </Link>
        </div>
      )}
    </>
  );
}
