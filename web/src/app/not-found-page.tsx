import { Link } from 'react-router';

export function NotFound() {
  return (
    <main className="grid min-h-svh place-content-center gap-4 text-center">
      <h1 className="text-3xl">Página não encontrada</h1>
      <Link to="/" className="text-primary underline-offset-4 hover:underline">
        Voltar para o início
      </Link>
    </main>
  );
}
