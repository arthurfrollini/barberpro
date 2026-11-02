import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import {
  availableSlots,
  becomeBarber,
  createShop,
  localDate,
  myServiceIds,
  signUp,
} from './support/api';
import { API } from './support/env';
import { PASSWORD, uniqueEmail } from './support/users';

/** The next Monday after today, in São Paulo. */
function nextMonday(): string {
  for (let days = 1; days <= 7; days++) {
    const date = localDate(days);
    if (new Date(`${date}T12:00:00Z`).getUTCDay() === 1) return date;
  }
  throw new Error('unreachable');
}

test('a new barber sets hours, a day off, a service and a profile, and can be booked', async ({
  page,
}) => {
  const email = uniqueEmail('owner');
  const token = await signUp(API, 'Rita Navalha', email, PASSWORD);
  await createShop(API, token, `Rita Cortes ${Date.now()}`);
  const barberId = await becomeBarber(API, token);

  await page.goto('/entrar');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();

  // hours: Monday to Saturday, 09:00 to 18:00
  await page.getByRole('link', { name: 'Horários' }).click();
  for (const day of ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']) {
    await page.getByRole('switch', { name: `${day}: trabalha` }).click();
  }
  await page.getByRole('button', { name: 'Salvar horários' }).click();
  await expect(page.getByText('Horários salvos')).toBeVisible();

  // a day off, never the Monday checked at the end
  const dayOff = [3, 4].map(localDate).find((d) => d !== nextMonday())!;
  await page.getByLabel('Dia', { exact: true }).fill(dayOff);
  await page.getByRole('button', { name: 'Bloquear dia' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Bloquear dia' }).click();
  await expect(page.getByText('Dia bloqueado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Desbloquear / })).toBeVisible();

  // a service
  await page.getByRole('link', { name: 'Serviços' }).click();
  await page.getByRole('button', { name: 'Novo serviço' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo serviço' });
  await dialog.getByLabel('Nome').fill('Corte');
  await dialog.getByLabel('Preço (R$)').fill('45');
  await dialog.getByLabel('Duração (minutos)').fill('30');
  await dialog.getByRole('button', { name: 'Criar serviço' }).click();
  await expect(page.getByRole('listitem', { name: 'Corte' })).toContainText('R$ 45,00, 30 min');

  // photo and bio
  await page.getByRole('link', { name: 'Perfil' }).click();
  const barberSection = page.getByRole('region', { name: 'Perfil de barbeiro' });
  await barberSection
    .getByLabel('Foto')
    .setInputFiles(fileURLToPath(new URL('./fixtures/avatar.png', import.meta.url)));
  await expect(barberSection.getByRole('img', { name: 'Foto' })).toBeVisible();
  await barberSection.getByLabel('Bio').fill('Navalha desde 2010.');
  await barberSection.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(page.getByText('Perfil salvo')).toBeVisible();

  // a customer can now book the next Monday from 09:00, and the last start fits before 18:00
  const [corte] = await myServiceIds(API, token);
  const slots = await availableSlots(API, { barberId, serviceId: corte!.id, date: nextMonday() });
  expect(slots).toContain(`${nextMonday()}T12:00:00.000Z`);
  expect(slots).toContain(`${nextMonday()}T20:30:00.000Z`);
  expect(slots).not.toContain(`${nextMonday()}T21:00:00.000Z`);
});
