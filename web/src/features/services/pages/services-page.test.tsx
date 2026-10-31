import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '@/app/routes';
import { ME, roles } from '@/test/fixtures';
import { api, gqlData } from '@/test/graphql';
import { renderRoutes, signIn } from '@/test/render';
import { server } from '@/test/server';

type Service = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  archived: boolean;
};

const corte: Service = {
  id: 's1',
  name: 'Corte',
  description: 'Tesoura e máquina',
  priceCents: 5000,
  durationMinutes: 30,
  archived: false,
};

function setup(initial: Service[]) {
  signIn();
  let services = [...initial];
  const calls: { op: string; variables: unknown }[] = [];
  server.use(
    api.query('Roles', () => gqlData(roles({ barber: true }))),
    api.query('Me', () => gqlData({ me: ME })),
    api.query('MyServices', () => gqlData({ myBarberProfile: { id: 'barber-1', services } })),
    api.mutation('CreateService', ({ variables }) => {
      calls.push({ op: 'create', variables });
      const input = variables.input as Omit<Service, 'id' | 'archived'>;
      const created = { id: `s${services.length + 1}`, archived: false, ...input };
      services = [...services, created];
      return gqlData({ createService: created });
    }),
    api.mutation('UpdateService', ({ variables }) => {
      calls.push({ op: 'update', variables });
      services = services.map((s) =>
        s.id === variables.id ? { ...s, ...(variables.input as Partial<Service>) } : s,
      );
      return gqlData({ updateService: services.find((s) => s.id === variables.id) });
    }),
    api.mutation('ArchiveService', ({ variables }) => {
      calls.push({ op: 'archive', variables });
      const archived = { ...services.find((s) => s.id === variables.id)!, archived: true };
      services = services.filter((s) => s.id !== variables.id);
      return gqlData({ archiveService: archived });
    }),
  );
  return { ...renderRoutes(routes, { path: '/servicos' }), calls };
}

describe('services', () => {
  it('invites the barber to create the first service', async () => {
    setup([]);
    expect(await screen.findByText('Nenhum serviço ainda')).toBeInTheDocument();
  });

  it('lists services with price and length', async () => {
    setup([corte]);
    const item = await screen.findByRole('listitem', { name: 'Corte' });
    expect(item).toHaveTextContent('Tesoura e máquina');
    expect(item).toHaveTextContent(/R\$\s50,00, 30 min/);
  });

  it('checks the form before creating', async () => {
    const { user, calls } = setup([]);
    await user.click(await screen.findByRole('button', { name: 'Novo serviço' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo serviço' });
    await user.type(within(dialog).getByLabelText('Preço (R$)'), 'abc');
    await user.clear(within(dialog).getByLabelText('Duração (minutos)'));
    await user.type(within(dialog).getByLabelText('Duração (minutos)'), '7');
    await user.click(within(dialog).getByRole('button', { name: 'Criar serviço' }));

    expect(await within(dialog).findByText('Informe o nome do serviço.')).toBeInTheDocument();
    expect(within(dialog).getByText('Use um valor como 45 ou 45,50.')).toBeInTheDocument();
    expect(within(dialog).getByText('De 5 a 480 minutos, de 5 em 5.')).toBeInTheDocument();
    expect(calls).toEqual([]);
  });

  it('creates a service in cents and minutes', async () => {
    const { user, calls } = setup([]);
    await user.click(await screen.findByRole('button', { name: 'Novo serviço' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo serviço' });
    await user.type(within(dialog).getByLabelText('Nome'), 'Barba');
    await user.type(within(dialog).getByLabelText('Preço (R$)'), '35,50');
    await user.clear(within(dialog).getByLabelText('Duração (minutos)'));
    await user.type(within(dialog).getByLabelText('Duração (minutos)'), '20');
    await user.click(within(dialog).getByRole('button', { name: 'Criar serviço' }));

    expect(await screen.findByRole('listitem', { name: 'Barba' })).toBeInTheDocument();
    expect(calls).toEqual([
      {
        op: 'create',
        variables: {
          input: { name: 'Barba', description: '', priceCents: 3550, durationMinutes: 20 },
        },
      },
    ]);
  });

  it('sends only what changed when editing', async () => {
    const { user, calls } = setup([corte]);
    const item = await screen.findByRole('listitem', { name: 'Corte' });
    await user.click(within(item).getByRole('button', { name: 'Editar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar serviço' });
    expect(within(dialog).getByText(/Agendamentos já feitos mantêm/)).toBeInTheDocument();
    const price = within(dialog).getByLabelText('Preço (R$)');
    expect(price).toHaveValue('50,00');
    await user.clear(price);
    await user.type(price, '55');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('listitem', { name: 'Corte' })).toHaveTextContent(/R\$\s55,00/);
    expect(calls).toEqual([{ op: 'update', variables: { id: 's1', input: { priceCents: 5500 } } }]);
  });

  it('archives after confirming', async () => {
    const { user, calls } = setup([corte]);
    const item = await screen.findByRole('listitem', { name: 'Corte' });
    await user.click(within(item).getByRole('button', { name: 'Arquivar' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('Clientes não poderão mais agendar Corte.');
    await user.click(within(confirm).getByRole('button', { name: 'Arquivar' }));

    expect(await screen.findByText('Nenhum serviço ainda')).toBeInTheDocument();
    expect(calls).toEqual([{ op: 'archive', variables: { id: 's1' } }]);
  });
});
