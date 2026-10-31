import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  it('shows the sign-in page at /entrar', async () => {
    window.history.pushState({}, '', '/entrar');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});
