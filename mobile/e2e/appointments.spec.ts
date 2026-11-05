import { expect, test } from '@playwright/test';
import { API } from './support/env';
import { at, book, cancel, localDate, setUpShop, signUp, uniqueEmail } from './support/api';
import { signInThroughUi } from './support/ui';

async function customerWithBooking(time = '10:00') {
  const shop = await setUpShop(API, `Barba Negra ${Date.now()}`);
  const email = uniqueEmail('bruno');
  const token = await signUp(API, 'Bruno Cliente', email);
  const id = await book(API, token, { ...shop, startsAt: at(localDate(1), time) });
  return { shop, email, id };
}

test('reschedules an appointment to another time', async ({ page }) => {
  const { email } = await customerWithBooking();
  await signInThroughUi(page, email);
  await page.goto('/agendamentos');
  await page.getByRole('link', { name: /Corte, Marcos Lima/ }).click();
  await page.getByRole('link', { name: 'Remarcar' }).click();

  await page.getByRole('button', { name: /^amanhã/ }).click();
  await page.getByLabel('Horários livres').getByRole('button', { name: '11:00' }).click();
  await page.getByRole('button', { name: 'Confirmar novo horário' }).click();

  await expect(page.getByText('Agendamento remarcado')).toBeVisible();
  await expect(page.getByText('11:00', { exact: true })).toBeVisible();

  // one step back is the list, not the detail as it was before
  await page.getByRole('link', { name: /back/ }).click();
  await expect(page.getByRole('link', { name: /Corte, Marcos Lima/ })).toBeVisible();
});

test('cancels an appointment after confirming', async ({ page }) => {
  const { email, id } = await customerWithBooking();
  await signInThroughUi(page, email);
  await page.goto(`/agendamento/${id}`);
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Cancelar agendamento' }).click();

  await expect(page.getByText('Agendamento cancelado.')).toBeVisible();
  await expect(page.getByText('Você cancelou.')).toBeVisible();
});

test('a cancellation by the barber shows up in Avisos', async ({ page }) => {
  const { shop, email, id } = await customerWithBooking('15:00');
  await cancel(API, shop.barberToken, id);

  await signInThroughUi(page, email);
  // the unread count sits on the tab
  await expect(page.getByRole('tab', { name: /Avisos/ })).toContainText('1');
  await page.goto('/avisos');
  await expect(page.getByText(/^Marcos Lima cancelou Corte de .* às 15:00\.$/)).toBeVisible();
});
