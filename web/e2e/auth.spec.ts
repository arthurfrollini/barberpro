import { expect, test } from '@playwright/test';
import { PASSWORD, signUpThroughUi, uniqueEmail } from './support/users';

test('sign up, stay signed in across reloads, sign out and back in', async ({ page }) => {
  const email = await signUpThroughUi(page, 'Ana Souza', uniqueEmail('ana'));
  await expect(page).toHaveURL('/comecar');
  await expect(page.getByRole('heading', { name: 'Começar' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Começar' })).toBeVisible();

  await page.getByRole('button', { name: 'Conta de Ana Souza' }).click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();
  await expect(page).toHaveURL('/entrar');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha').fill('not the password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Email ou senha incorretos.')).toBeVisible();

  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Começar' })).toBeVisible();
});

test('a page opened while signed out comes back after sign in', async ({ page }) => {
  const email = await signUpThroughUi(page, 'Bruno Lima');
  await page.getByRole('button', { name: 'Conta de Bruno Lima' }).click();
  await page.getByRole('menuitem', { name: 'Sair' }).click();

  await page.goto('/perfil');
  await expect(page).toHaveURL('/entrar?voltar=%2Fperfil');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
});
