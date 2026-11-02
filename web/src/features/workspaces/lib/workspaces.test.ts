import { describe, expect, it } from 'vitest';
import { buildWorkspaces, landingPath, pickActive, type Workspace } from './workspaces';

const shop = (id: string, name: string) => ({
  id,
  name,
  timezone: 'America/Sao_Paulo',
  logoUrl: null,
});
const profile = (id: string, s: ReturnType<typeof shop>) => ({
  id,
  name: 'José',
  bio: '',
  avatarUrl: null,
  barbershop: s,
});

const mega = shop('s1', 'Mega');
const filial = shop('s2', 'Filial');
const outra = shop('s3', 'Outra Barbearia');

describe('buildWorkspaces', () => {
  it('joins owned shops and barber profiles, one workspace per shop, by name', () => {
    const list = buildWorkspaces({
      myBarbershops: [mega, filial],
      myBarberProfiles: [profile('b1', mega), profile('b3', outra)],
    });
    expect(list.map((w) => [w.shop.name, w.owner, w.barber?.id ?? null])).toEqual([
      ['Filial', true, null],
      ['Mega', true, 'b1'],
      ['Outra Barbearia', false, 'b3'],
    ]);
  });

  it('is empty for someone with no shop yet', () => {
    expect(buildWorkspaces({ myBarbershops: [], myBarberProfiles: [] })).toEqual([]);
  });
});

describe('pickActive', () => {
  const list = buildWorkspaces({
    myBarbershops: [filial],
    myBarberProfiles: [profile('b1', mega)],
  });

  it('keeps the chosen shop while it is still one of the workspaces', () => {
    expect(pickActive(list, 's2')?.shop.id).toBe('s2');
  });

  it('falls back to the first shop where the user barbers, then the first owned', () => {
    expect(pickActive(list, 'gone')?.shop.id).toBe('s1');
    expect(pickActive(list, null)?.shop.id).toBe('s1');
    const ownerOnly = buildWorkspaces({ myBarbershops: [filial], myBarberProfiles: [] });
    expect(pickActive(ownerOnly, null)?.shop.id).toBe('s2');
    expect(pickActive([], 's1')).toBeNull();
  });
});

describe('landingPath', () => {
  const ws = (barber: boolean, owner: boolean): Workspace => ({
    shop: mega,
    owner,
    barber: barber ? { id: 'b1', name: 'José', bio: '', avatarUrl: null } : null,
  });

  it.each([
    [ws(true, false), '/agenda'],
    [ws(true, true), '/agenda'],
    [ws(false, true), '/barbearia'],
    [null, '/comecar'],
  ])('%o lands on %s', (workspace, path) => {
    expect(landingPath(workspace)).toBe(path);
  });
});
