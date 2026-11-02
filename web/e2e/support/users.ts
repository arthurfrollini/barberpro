import { expect, type Page } from '@playwright/test';

/** A fresh email per test, so tests share the database without cleaning it. */
export const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

export const PASSWORD = 'correct horse battery';

export async function signUpThroughUi(page: Page, name: string, email = uniqueEmail('user')) {
  await page.goto('/criar-conta');
  await page.getByLabel('Nome').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Criar conta');
  return email;
}
