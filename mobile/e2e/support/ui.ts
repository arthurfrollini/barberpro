import { expect, type Page } from '@playwright/test';
import { PASSWORD } from './api';

export async function signInThroughUi(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Explorar').first()).toBeVisible();
}
