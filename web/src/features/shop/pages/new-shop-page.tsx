import { Link, useNavigate } from 'react-router';
import { useActiveWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/page-header';
import { ShopForm } from '../components/shop-form';

/** From the switcher: one more shop. Once created, it becomes the active one. */
export function NewShopPage() {
  const navigate = useNavigate();
  const { select } = useActiveWorkspace();
  return (
    <>
      <PageHeader
        title="Nova barbearia"
        description="Ela aparece no seletor de barbearias, ao lado das que você já tem."
      />
      <ShopForm
        onCreated={(shopId) => {
          select(shopId);
          navigate('/barbearia', { replace: true });
        }}
      />
      <div className="mt-4">
        <Button variant="ghost" asChild>
          <Link to="/">Voltar</Link>
        </Button>
      </div>
    </>
  );
}
