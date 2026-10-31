import { expect, test } from '@playwright/test';
import { at, book, localDate, setUpBarber, signUp } from './support/api';
import { API } from './support/env';
import { PASSWORD, uniqueEmail } from './support/users';

test('the agenda shows bookings, updates live and cancels', async ({ page }) => {
  const barberEmail = uniqueEmail('barber');
  const barber = await signUp(API, 'Marcos Barbeiro', barberEmail, PASSWORD);
  const shop = await setUpBarber(API, barber, { shopName: `Navalha ${Date.now()}` });
  const tomorrow = localDate(1);
  const ana = await signUp(API, 'Ana Cliente', uniqueEmail('ana'), PASSWORD);
  await book(API, ana, { ...shop, startsAt: at(tomorrow, '10:00') });

  await page.goto(`/entrar?voltar=${encodeURIComponent(`/agenda?dia=${tomorrow}`)}`);
  await page.getByLabel('Email').fill(barberEmail);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  const day = page.getByRole('list', { name: 'Agendamentos do dia' });
  await expect(day.getByRole('button', { name: '10:00 Ana Cliente, Corte' })).toBeVisible();
  await expect(page.getByText('1 agendamento, R$ 50,00 previstos')).toBeVisible();

  // another customer books while the agenda is open
  const bruno = await signUp(API, 'Bruno Cliente', uniqueEmail('bruno'), PASSWORD);
  await book(API, bruno, { ...shop, startsAt: at(tomorrow, '11:00') });
  await expect(day.getByRole('button', { name: '11:00 Bruno Cliente, Corte' })).toBeVisible();
  await expect(page.getByText(/^Novo agendamento: Bruno Cliente/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Notificações, 2 não lidas' })).toBeVisible();

  await day.getByRole('button', { name: '10:00 Ana Cliente, Corte' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ana Cliente' });
  await sheet.getByRole('button', { name: 'Cancelar agendamento' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar agendamento' }).click();
  await expect(page.getByText('Agendamento cancelado', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    day.getByRole('button', { name: '10:00 Ana Cliente, Corte, cancelado' }),
  ).toBeVisible();
  await expect(page.getByText('1 agendamento, R$ 50,00 previstos')).toBeVisible();
});
