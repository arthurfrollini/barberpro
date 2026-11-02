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

## V2: argumentos explícitos

Na v1, `mySchedule` e `becomeBarber` não tinham argumento: "o meu" era implícito, porque cada pessoa tinha uma barbearia só. Com várias, a operação precisa dizer sobre qual (`mySchedule(barberId)`, `becomeBarber(shopId)`). Mudar a assinatura quebra clientes; aqui o único cliente era a dashboard, no mesmo repositório, então a troca foi feita de uma vez no mesmo PR, e o codegen da dashboard apontou cada lugar que precisava mudar. Com clientes externos (o app do cliente, no futuro), o caminho seria adicionar o argumento como opcional, marcar o campo antigo com `@deprecated` e remover depois.

O resolver confere a posse: `ownBarber(userId, barberId)` devolve `NOT_A_BARBER` tanto para id de outra pessoa quanto para id que não existe.

## Do lado da dashboard

A dashboard consome o mesmo schema, sem Apollo:

- **Documentos tipados.** Cada operação é escrita com ``graphql(`...`)`` num arquivo `api/` da feature (por exemplo `features/agenda/api/agenda.ts`). O client preset do GraphQL Code Generator gera um `TypedDocumentString<Resultado, Variáveis>`: o cliente manda a string e o TypeScript sabe o formato da resposta e das variáveis.
- **Fragments.** `fragment AgendaAppointment on Appointment { ... }` é usado pela query do dia, pelas mutations de cancelar e remarcar e pela subscription, então todas devolvem a mesma forma e o cache pode trocar uma pela outra.
- **Erros.** O cliente lê `extensions.code` e lança `ApiError(code)`; a tela traduz o código para português (`shared/lib/error-messages.ts`). A mensagem em inglês da API nunca aparece.
- **Subscriptions.** `agendaChanged(barberId)` vai por SSE com `graphql-sse`, com as variáveis no corpo, como uma query.
- **Testes.** O MSW intercepta por nome de operação (`api.query('BarberAgenda', ...)`), então o teste declara a resposta da API como ela é, sem mockar hook nenhum.

## Frase para entrevista

"I went schema-first: the SDL files are the contract and the documentation, and GraphQL Code Generator types the resolvers against them, so a resolver returning the wrong shape fails the build. Business errors carry a stable code in extensions, and anything unexpected is masked as INTERNAL so nothing leaks."
