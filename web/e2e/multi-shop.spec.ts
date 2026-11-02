import { expect, test } from '@playwright/test';
import {
  acceptInvite,
  addService,
  at,
  book,
  invite,
  localDate,
  setHours,
  setUpBarber,
  signUp,
  tryBook,
} from './support/api';
import { API } from './support/env';
import { waitForEmail } from './support/mailpit';
import { PASSWORD, uniqueEmail } from './support/users';

test('an owner opens a second shop from the switcher', async ({ page }) => {
  const email = uniqueEmail('owner');
  const token = await signUp(API, 'Lia Dona', email, PASSWORD);
  const first = `Lia Centro ${Date.now()}`;
  await setUpBarber(API, token, { shopName: first });

  await page.goto('/entrar');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(
    page.getByRole('button', { name: `Barbearia atual: ${first}. Trocar de barbearia` }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Barbearia atual:/ }).click();
  await page.getByRole('menuitem', { name: 'Nova barbearia' }).click();
  const second = `Lia Bairro ${Date.now()}`;
  const form = page.getByRole('form', { name: 'Dados da barbearia' });
  await form.getByLabel('Nome').fill(second);
  await form.getByLabel('Ano de fundação').fill('2024');
  await form.getByLabel('Endereço').fill('Rua Teodoro Sampaio, 500');
  await form.getByLabel('Latitude').fill('-23.5650');
  await form.getByLabel('Longitude').fill('-46.6840');
  await form.getByRole('button', { name: 'Criar barbearia' }).click();

  await expect(page).toHaveURL('/barbearia');
  await expect(
    page.getByRole('button', { name: `Barbearia atual: ${second}. Trocar de barbearia` }),
  ).toBeVisible();
  // she does not barber in the new one yet
  await expect(page.getByRole('button', { name: 'Atender também' })).toBeVisible();
  await page.getByRole('button', { name: /Barbearia atual:/ }).click();
  await expect(
    page.getByRole('menuitem', { name: new RegExp(`${first}\\s*Dono e barbeiro`) }),
  ).toBeVisible();
  await expect(page.getByRole('menuitem', { name: new RegExp(`${second}\\s*Dono`) })).toBeVisible();
});

test('a barber in two shops switches between their agendas, and is never double-booked', async ({
  page,
}) => {
  // Tiago owns a shop and is invited to Paula's
  const tiagoEmail = uniqueEmail('tiago');
  const tiago = await signUp(API, 'Tiago Barbeiro', tiagoEmail, PASSWORD);
  const own = `Tiago Cortes ${Date.now()}`;
  const tiagoShop = await setUpBarber(API, tiago, { shopName: own });
  const paula = await signUp(API, 'Paula Dona', uniqueEmail('paula'), PASSWORD);
  const theirs = `Paula Barbearia ${Date.now()}`;
  const paulaShop = await setUpBarber(API, paula, { shopName: theirs });
  await invite(API, paula, paulaShop.shopId, tiagoEmail);
  const code = /code: (\S+)/.exec(await waitForEmail(tiagoEmail))![1]!;
  const there = await acceptInvite(API, tiago, code);
  await setHours(API, tiago, there);
  const thereService = await addService(API, tiago, there, {
    name: 'Corte na Paula',
    priceCents: 6000,
    durationMinutes: 30,
  });

  const tomorrow = localDate(1);
  const ana = await signUp(API, 'Ana Cliente', uniqueEmail('ana'), PASSWORD);
  const bia = await signUp(API, 'Bia Cliente', uniqueEmail('bia'), PASSWORD);
  await book(API, ana, { ...tiagoShop, startsAt: at(tomorrow, '10:00') });
  await book(API, bia, {
    barberId: there,
    serviceId: thereService,
    startsAt: at(tomorrow, '15:00'),
  });
  // the same person cannot be booked at the other shop at the same time
  expect(
    await tryBook(API, bia, {
      barberId: there,
      serviceId: thereService,
      startsAt: at(tomorrow, '10:00'),
    }),
  ).toMatch(/no longer available/);

  await page.goto(`/entrar?voltar=${encodeURIComponent(`/agenda?dia=${tomorrow}`)}`);
  await page.getByLabel('Email').fill(tiagoEmail);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  const day = page.getByRole('list', { name: 'Agendamentos do dia' });
  // the shops are listed by name, and Paula's comes first
  await expect(
    day.getByRole('button', { name: '15:00 Bia Cliente, Corte na Paula' }),
  ).toBeVisible();
  await expect(day.getByRole('button', { name: /Ana Cliente/ })).toHaveCount(0);

  await page.getByRole('button', { name: /Barbearia atual:/ }).click();
  await page.getByRole('menuitem', { name: new RegExp(own) }).click();
  await expect(day.getByRole('button', { name: '10:00 Ana Cliente, Corte' })).toBeVisible();
  await expect(day.getByRole('button', { name: /Bia Cliente/ })).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Equipe' }),
  ).toBeVisible();
});
