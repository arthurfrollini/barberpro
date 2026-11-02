import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderRoutes } from '@/test/render';
import { RouteError } from './route-error';

function Broken(): never {
  throw new Error('boom');
}

describe('RouteError', () => {
  it('replaces a crashed screen with a way back, in Portuguese', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderRoutes([{ path: '/', element: <Broken />, errorElement: <RouteError /> }]);
    expect(
      await screen.findByRole('heading', { name: 'Algo deu errado nesta tela' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
  });
});
