# Testes e CI — BarberPro

## Três níveis (projetos do Vitest)

| Projeto       | Onde                | O que testa                       | Banco?                                 |
| ------------- | ------------------- | --------------------------------- | -------------------------------------- |
| `unit`        | `src/**/*.test.ts`  | domínio e casos de uso            | não: adaptadores em memória            |
| `integration` | `test/integration/` | repositórios TypeORM e migrations | Postgres de verdade (`barberpro_test`) |
| `e2e`         | `test/e2e/`         | operações GraphQL pelo HTTP       | Postgres e Redis de verdade            |

Comandos: `npm run test:unit`, `test:integration`, `test:e2e`, ou `npm test` para tudo.

## Ferramentas de teste

- **`FixedClock`** (`src/shared/testing/fixed-clock.ts`): o "agora" é uma porta (`Clock`). Nos testes, controlo o tempo com `clock.advanceMinutes(...)`. É assim que testo "o refresh token expira em 30 dias" sem esperar 30 dias, e é assim que vou testar a regra das 2 horas na fase 3.
- **Adaptadores em memória** (`modules/identity/testing/in-memory.ts`): repositórios com `Map`, hasher fake. Os testes unitários rodam em milissegundos.
- **`createTestApp()`** (`test/support/app.ts`): sobe o app real (container, Fastify, Yoga) contra o banco de teste, migrado e vazio.
- **`truncateAll()`**: esvazia todas as tabelas entre testes.
- **`gql()`**: manda uma operação GraphQL pelo `app.inject` (sem abrir porta).

Integração e e2e rodam um arquivo por vez (`fileParallelism: false`), porque dividem o mesmo banco.

## TDD

Cada comportamento começou por um teste que falhou. Exemplo real: o teste de mapeamento de erro do GraphQL falhou por um motivo inesperado (duas cópias do `graphql`, ver [GraphQL](GraphQL.md)), e foi o teste que achou o problema.

## CI (GitHub Actions)

`.github/workflows/ci.yml` roda a cada push na `main` e em todo PR:

1. `npm ci`
2. codegen + `git diff --exit-code` (os tipos gerados estão em dia?)
3. lint, typecheck, prettier
4. unit, integração, e2e (Postgres com PostGIS e Redis como service containers, nas mesmas portas do Docker Compose)
5. build

## Frase para entrevista

"Time is a port, so rules like 'cancel at least two hours before' are unit-tested with a fixed clock. Repositories are tested against real Postgres, and end-to-end tests go through the real Fastify and GraphQL stack with app.inject. CI runs all three with Postgres and Redis service containers."
