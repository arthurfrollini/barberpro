# GraphQL — BarberPro

## O básico

GraphQL é uma linguagem de consulta: o cliente manda **uma** requisição dizendo exatamente quais campos quer, e o servidor devolve só isso. Tudo passa por um endpoint (`POST /graphql`).

- **Query**: leitura (`me`, `barbershop(id)`).
- **Mutation**: escrita (`signUp`, `bookAppointment`).
- **Subscription**: o servidor empurra eventos (fase 4: `agendaChanged`).
- **Schema (SDL)**: o contrato, com tipos, campos e argumentos. Ex.: `src/modules/identity/adapters/graphql/identity.graphql`.
- **Resolver**: a função que produz o valor de um campo.

## Yoga, Apollo... o que é isso?

São **servidores GraphQL**: a biblioteca que recebe a requisição HTTP, valida a query contra o schema e chama os resolvers.

- **Apollo Server**: o mais conhecido, da empresa Apollo.
- **GraphQL Yoga** (The Guild): leve, segue os padrões do Fetch API, tem subscriptions por SSE e WebSocket e roda dentro de qualquer servidor HTTP. Aqui ele está montado dentro do Fastify, em `src/app.ts`.

Escolhi Yoga porque ele convive bem com o Fastify (o `/health` e os uploads continuam rotas Fastify normais) e já traz subscriptions.

## Schema-first + codegen

Existem dois jeitos de escrever o schema:

- **Code-first**: o schema sai do código TypeScript (Pothos, TypeGraphQL).
- **Schema-first**: escreve o `.graphql` à mão e implementa os resolvers. **É o que usamos.**

O problema clássico do schema-first é o resolver não bater com o schema. O **GraphQL Code Generator** resolve: lê os `.graphql` e gera `src/shared/adapters/graphql/generated/resolvers.ts`. Se o resolver devolver o tipo errado, o `npm run typecheck` falha. Rode `npm run codegen` sempre que mexer num `.graphql`. O CI falha se o arquivo gerado estiver desatualizado.

**Mappers**: o resolver devolve o objeto de domínio (`User`), não o tipo do GraphQL. No `codegen.ts`, `mappers: { User: '...#User' }` diz isso ao gerador, e aí só preciso escrever resolvers para os campos que diferem (`email: (user) => user.email.value`).

## Contexto

O contexto é criado por requisição e chega em todo resolver como terceiro argumento. Aqui ele tem só `currentUserId`, lido do `Authorization: Bearer`. Resolvers que exigem login chamam `requireUser(ctx)`, que lança `UNAUTHENTICATED`.

## Erros

GraphQL responde quase sempre HTTP 200, com um array `errors`. Para o cliente saber **o que** deu errado, cada erro de regra tem um código estável em `extensions.code`:

```json
{
  "errors": [
    {
      "message": "An account with this email already exists.",
      "extensions": { "code": "EMAIL_TAKEN" }
    }
  ]
}
```

`src/shared/adapters/graphql/mask-error.ts` decide:

- `DomainError` → mensagem + código;
- erro do próprio GraphQL (query inválida) → passa como está;
- qualquer outra coisa → loga e devolve `"Unexpected error."` com `INTERNAL`. Assim stack trace e SQL nunca vazam.

## N+1 e DataLoader (fase 2)

Se uma lista de 20 agendamentos pede `barber { name }`, um resolver ingênuo faz 1 query para a lista e 20 para os barbeiros. O **DataLoader** junta as 20 chamadas do mesmo tick numa só (`WHERE id IN (...)`). Um DataLoader novo por requisição, para o cache não vazar entre usuários.

## Pegadinha que apareceu: duas cópias do `graphql`

O `graphql` 17 publica um build separado para a condição `development`. O Vitest resolvia esse build para o nosso código, enquanto o Yoga carregava o build normal. Resultado: duas classes `GraphQLError`, e o `instanceof` falhava só nos testes. A correção está em `vitest.config.ts` (um alias para o mesmo arquivo que o Node carrega). Em produção sempre existe uma cópia só.

## Frase para entrevista

"I went schema-first: the SDL files are the contract and the documentation, and GraphQL Code Generator types the resolvers against them, so a resolver returning the wrong shape fails the build. Business errors carry a stable code in extensions, and anything unexpected is masked as INTERNAL so nothing leaks."
