import { expect, test } from '@playwright/test';
import { API } from './support/env';
import { barberAgenda, localDate, PASSWORD, setUpShop, uniqueEmail } from './support/api';

test('a new customer finds a shop, signs up on the way and books', async ({ page }) => {
  const shopName = `Navalha ${Date.now()}`;
  const shop = await setUpShop(API, shopName);

  await page.goto('/');
  // location is granted: shops around Av. Paulista are listed
  await expect(page.getByText('Perto de você')).toBeVisible();
  await page.getByLabel('Buscar barbearia').fill(shopName);
  await page.getByRole('link', { name: new RegExp(shopName) }).click();
  await expect(page.getByText('14 anos de casa')).toBeVisible();
  await page.getByRole('link', { name: /Marcos Lima/ }).click();
  await page.getByRole('link', { name: /^Corte/ }).click();

  await page.getByRole('button', { name: /^amanhã/ }).click();
  await page.getByLabel('Horários livres').getByRole('button', { name: '10:00' }).click();
  await page.getByRole('radio', { name: '1 h', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar para agendar' }).click();

  // no account yet: sign up, and come back to the same choice
  await page.getByRole('link', { name: 'Criar conta' }).click();
  await page.getByLabel('Nome').fill('Ana Cliente');
  await page.getByLabel('Email').fill(uniqueEmail('ana'));
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  // the footer reads back the time chosen before signing up
  await expect(page.getByText(/às 10:00 · R\$\s50,00$/)).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar agendamento' }).click();
  await expect(page.getByText('Agendado', { exact: true })).toBeVisible();
  await expect(page.getByText('10:00', { exact: true })).toBeVisible();
  await expect(page.getByText('1 h antes')).toBeVisible();

  // it is on the barber's agenda
  const agenda = await barberAgenda(API, shop.barberToken, shop.barberId, localDate(1));
  expect(agenda.map((a) => a.status)).toEqual(['BOOKED']);

  await page.goto('/agendamentos');
  await expect(page.getByRole('link', { name: /Corte, Marcos Lima/ })).toBeVisible();
});
