import { Link } from 'react-router';
import { Button } from '@/shared/ui/button';

/**
 * Shown when a screen throws while rendering, instead of React Router's English default. The
 * error itself stays in the console; the user gets a way out.
 */
export function RouteError({ inline = false }: { inline?: boolean }) {
  // inside the app shell the navigation stays; outside it, the page is the whole screen
  const Wrapper = inline ? 'div' : 'main';
  return (
    <Wrapper
      className={
        inline
          ? 'flex flex-col items-start gap-4 py-8'
          : 'grid min-h-svh place-content-center gap-4 px-6 text-center'
      }
    >
      <h1 className="text-3xl">Algo deu errado nesta tela</h1>
      <p className="max-w-prose text-muted-foreground">
        Recarregue a página. Se continuar, volte para o início e tente de novo.
      </p>
      <div className={inline ? 'flex gap-2' : 'flex justify-center gap-2'}>
        <Button onClick={() => window.location.reload()}>Recarregar</Button>
        <Button variant="outline" asChild>
          <Link to="/">Voltar para o início</Link>
        </Button>
      </div>
    </Wrapper>
  );
}
