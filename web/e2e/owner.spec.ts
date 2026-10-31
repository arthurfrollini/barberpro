import { expect, test } from '@playwright/test';
import { waitForEmail } from './support/mailpit';
import { PASSWORD, uniqueEmail } from './support/users';

test('an owner opens a shop, joins it, invites a barber who accepts, and removes them', async ({
  page,
  browser,
}) => {
  // the owner signs up and creates the shop from Começar
  const ownerEmail = uniqueEmail('owner');
  await page.goto('/criar-conta');
  await page.getByLabel('Nome').fill('Paula Dona');
  await page.getByLabel('Email').fill(ownerEmail);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.getByRole('button', { name: 'Tenho uma barbearia' }).click();
  const shopForm = page.getByRole('form', { name: 'Dados da barbearia' });
  const shopName = `Barbearia da Paula ${Date.now()}`;
  await shopForm.getByLabel('Nome').fill(shopName);
  await shopForm.getByLabel('Ano de fundação').fill('2015');
  await shopForm.getByLabel('Endereço').fill('Rua Oscar Freire, 100');
  await shopForm.getByLabel('Latitude').fill('-23.5617');
  await shopForm.getByLabel('Longitude').fill('-46.6694');
  await shopForm.getByRole('button', { name: 'Criar barbearia' }).click();
  await expect(page).toHaveURL('/barbearia');

  // and joins it as a barber
  await page.getByRole('button', { name: 'Atender também' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Agenda' }),
  ).toBeVisible();

  // invites a barber
  const barberEmail = uniqueEmail('barber');
  await page.getByRole('link', { name: 'Equipe' }).click();
  await page.getByLabel('Email do barbeiro').fill(barberEmail);
  await page.getByRole('button', { name: 'Enviar convite' }).click();
  const invites = page.getByRole('list', { name: 'Convites' });
  await expect(invites.getByRole('listitem', { name: barberEmail })).toContainText('Pendente');

  // the barber opens the link from the email, signs up and accepts
  const email = await waitForEmail(barberEmail);
  const link = /https?:\/\/\S+\/convite\?codigo=\S+/.exec(email)![0];
  const barberContext = await browser.newContext();
  const barberPage = await barberContext.newPage();
  await barberPage.goto(link);
  await expect(barberPage).toHaveURL(/\/entrar\?voltar=/);
  await barberPage.getByRole('link', { name: 'Criar conta' }).click();
  await barberPage.getByLabel('Nome').fill('Tiago Barbeiro');
  await barberPage.getByLabel('Email').fill(barberEmail);
  await barberPage.getByLabel('Senha').fill(PASSWORD);
  await barberPage.getByRole('button', { name: 'Criar conta' }).click();
  await expect(barberPage.getByLabel('Código do convite')).not.toHaveValue('');
  await barberPage.getByRole('button', { name: 'Aceitar convite' }).click();
  await expect(barberPage.getByText(`Bem-vindo à equipe da ${shopName}`)).toBeVisible();
  await expect(barberPage).toHaveURL('/agenda');
  await barberContext.close();

  // the owner sees the new barber, and removes them
  await page.reload();
  await expect(invites.getByRole('listitem', { name: barberEmail })).toContainText('Aceito');
  const barbers = page.getByRole('list', { name: 'Barbeiros' });
  await expect(barbers.getByRole('listitem', { name: 'Paula Dona (você)' })).toBeVisible();
  await barbers
    .getByRole('listitem', { name: 'Tiago Barbeiro' })
    .getByRole('button', { name: 'Remover' })
    .click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }).click();
  await expect(page.getByText('Tiago Barbeiro saiu da equipe')).toBeVisible();
  await expect(barbers.getByRole('listitem', { name: 'Tiago Barbeiro' })).toHaveCount(0);
});
