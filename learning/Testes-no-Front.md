# Dashboard: testes

Três níveis, do mais rápido ao mais real.

## 1. Funções puras (Vitest)

`money.ts`, `time.ts`, `error-messages.ts`, o session store. Sem DOM, sem rede. Exemplo: `parseBRL('R$ 1.234,56')` vira `123456` centavos; `todayIn('America/Sao_Paulo', ...)` às 23h30 de São Paulo ainda é o mesmo dia, mesmo que em UTC já seja o seguinte.

O session store recebe `storage`, `refresh`, `lock` e `now` por parâmetro. Assim o teste simula "outra aba renovou enquanto esta esperava o lock" só escrevendo no `localStorage` dentro de um lock falso.

## 2. Componentes (Vitest + Testing Library + MSW)

- **jsdom** faz o papel do navegador.
- **Testing Library** procura elementos como um usuário procuraria: `getByLabelText('Email')`, `getByRole('button', { name: 'Entrar' })`. Se o teste não acha o campo pelo rótulo, um leitor de tela também não acharia.
- **MSW** intercepta o `fetch` na rede. O componente, o hook, a função da api e o cliente rodam de verdade; só a resposta do servidor é falsa. Por isso os testes não quebram quando a implementação muda, só quando o comportamento muda.

```ts
server.use(api.mutation('SignIn', () => gqlError('INVALID_CREDENTIALS')));
await user.click(screen.getByRole('button', { name: 'Entrar' }));
expect(await screen.findByText('Email ou senha incorretos.')).toBeInTheDocument();
```

`src/test/render.tsx` monta as rotas num `createMemoryRouter` com os mesmos providers do app (QueryClient sem retry, para o erro aparecer na hora). `onUnhandledFrame: 'error'` faz o teste falhar se o componente chamar uma operação que o teste não declarou.

**Vitest em vez de Jest:** a API é a mesma (`describe`, `it`, `expect`, matchers do jest-dom), mas o Vitest usa a transformação do próprio Vite (TypeScript, JSX, alias `@/`), sem Babel nem ts-jest. A API do projeto já usa Vitest.

## 3. Ponta a ponta (Playwright)

O Playwright sobe a API de verdade (porta 4100, banco `barberpro_test`, migrations antes) e o Vite (porta 5181) e dirige um Chromium. Nada é mockado.

- Cada teste cria seus próprios usuários com email único, então os testes rodam em paralelo e o banco não precisa ser limpo.
- Foi o Playwright que achou um bug que os testes de componente não pegaram: ao sair, a ordem das atualizações do React mandava para `/entrar?voltar=...`. O teste de componente passava porque a ordem lá era outra.

## No CI

Job `web`: codegen sem diff, lint, typecheck, prettier, testes, build. Job `web-e2e`: Postgres, Redis e Mailpit como service containers e o Playwright; se falhar, o relatório HTML sobe como artefato.

## Comandos

```bash
cd web
npm test            # unit + componentes
npm run test:e2e    # Playwright (precisa de docker compose up -d postgres redis mailpit)
npm run check       # lint, typecheck, prettier e testes
```
