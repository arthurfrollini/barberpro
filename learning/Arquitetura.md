# Arquitetura — BarberPro

## Visão geral

```
  app (celular) / dashboard (web)
            │  HTTP: POST /graphql, GET /health, POST /uploads, GET /files/:id
            ▼                         SSE/WebSocket: subscription agendaChanged
┌──────────────────────── API (Fastify + GraphQL Yoga) ────────────────────────┐
│ adapters de entrada: resolvers GraphQL, rotas REST                            │
│        │                                                                      │
│ application: casos de uso + portas      identity · shops · scheduling ·       │
│        │                                notifications                         │
│ domain: entidades, value objects, erros (sem framework)                       │
│        ▲                                                                      │
│ adapters de saída: TypeORM, argon2, jose, disco, BullMQ, Redis pub/sub        │
└───────┬──────────────────────┬───────────────────────────┬────────────────────┘
        ▼                      ▼                           ▼
  PostgreSQL + PostGIS      Redis (filas, pub/sub)     worker (src/worker.ts)
                                   ▲                       │ email (SMTP/Mailpit)
                                   └────── consome ────────┘ lembretes
```

**Hexagonal** (ou "ports and adapters") quer dizer: o centro (domínio e casos de uso) não sabe que existe GraphQL, Postgres ou Redis. Ele declara **portas** (interfaces como `UserRepository`, `Clock`, `SchedulingEvents`, `MailQueue`) e o mundo de fora pluga **adaptadores** nelas.

São **dois processos** com o mesmo código: a API (`src/main.ts`) e o worker (`src/worker.ts`), que consome as filas de email e lembretes.

## Pastas

```
src/
  main.ts / worker.ts  os dois processos
  app.ts               monta o Fastify: /health, uploads e /graphql
  container.ts         composition root: cria cada adaptador e liga nas portas
  config.ts            lê e valida o .env com zod
  shared/              o que todo módulo usa: DomainError, Clock, fuso horário,
                       GraphQL (Yoga, erros, DataLoaders, pub/sub), banco, filas, uploads
  modules/
    identity/          usuários, login, tokens
    shops/             barbearias, convites, barbeiros, serviços
    scheduling/        horários semanais, folgas, horários livres, agendamentos
    notifications/     notificações, emails, lembretes, agenda ao vivo
      domain/ application/ adapters/ testing/   (mesmo formato em todos)
```

### Como os módulos conversam

- `scheduling` lê barbeiros e serviços por uma porta própria (`ShopDirectory`), que o container liga aos repositórios de `shops`.
- `shops` chama `persistRemoval` ao remover um barbeiro; o container faz a remoção e os cancelamentos da agenda numa transação só.
- `scheduling` publica eventos (`SchedulingEvents`); `notifications` é o adaptador dessa porta. A agenda não sabe que notificações existem.

## O caminho de uma requisição: `signUp`

1. O Fastify recebe `POST /graphql` e entrega para o Yoga.
2. O Yoga monta o **contexto**: lê `Authorization: Bearer`, valida o JWT e guarda só o `currentUserId`.
3. O resolver `Mutation.signUp` chama o caso de uso `signUp(deps, input)`.
4. O caso de uso normaliza o email (`Email.parse`), checa a política de senha, vê se o email já existe, gera o hash com argon2, cria o `User` e salva pelo `UserRepository`.
5. O repositório TypeORM converte `User` em `UserRecord` (mapper) e faz o upsert.
6. `issueSession` gera o access token (JWT, 15 min) e o refresh token (aleatório, só o hash vai pro banco).
7. Se algo quebrar uma regra, sai um `DomainError` com código, e o Yoga devolve `extensions.code`. Qualquer outro erro vira `INTERNAL` com mensagem genérica, e o detalhe vai pro log.

## Regras que a arquitetura garante

- **Domínio sem framework.** O ESLint falha se `domain/` ou `application/` importar `typeorm`, `fastify`, `graphql` ou qualquer `adapters/`.
- **Decorators só nos records.** `User` é uma classe pura; `UserRecord` tem os `@Column`. Dá mais código (um mapper por entidade), mas o domínio não muda quando o banco muda.
- **Composition root feito à mão.** Sem container de injeção de dependência (como o do NestJS). Tudo que liga porta a adaptador está em `container.ts`, legível de cima a baixo.
- **Casos de uso são funções** que recebem as dependências como primeiro argumento (`signUp(deps, input)`). Nada de classe com um método `execute`.

## Por que não...

- **NestJS?** Ele já traz módulos e DI prontos, e o Finwise já mostra NestJS. Aqui o ponto é mostrar a arquitetura sem o framework fazer por mim.
- **DDD completo?** DDD tático (entidades, value objects, agregados) só onde tem regra de verdade: a agenda (fase 3). DDD estratégico (bounded contexts, context map) seria cerimônia para um time de uma pessoa.
- **Microsserviços?** Um deploy, um banco. Os módulos já dão a separação; se um dia precisar dividir, a fronteira está pronta.

## Frase para entrevista

"It's a modular monolith with a hexagonal architecture: GraphQL and REST are driving adapters, TypeORM, argon2 and JWT are driven adapters, and the use cases in the middle only see ports. ESLint enforces that the domain imports no framework, and I wire everything by hand in one composition root, so there's no DI magic to explain."
