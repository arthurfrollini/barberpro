# Dashboard: arquitetura do front

A dashboard é um SPA em React (Vite) dentro de `web/`. Ela é o primeiro cliente da API: barbeiros veem a agenda e cuidam de serviços e horários; donos cuidam da barbearia e da equipe.

## Pastas por feature

```
web/src/
  app/          providers, rotas, layout, guards
  features/
    auth/       api/  hooks/  components/  pages/
    roles/      api/  hooks/
    ...         (agenda, horários, serviços, perfil, barbearia, equipe)
  shared/
    api/        cliente GraphQL, sessão, erros, query client
    ui/         componentes shadcn (Radix + Tailwind)
    lib/        dinheiro, fuso horário, mensagens de erro, limites
  gql/          gerado pelo codegen (não editar)
```

Cada feature junta tudo que muda junto. Dentro dela, as camadas têm um sentido só:

```
pages  →  components  →  hooks  →  api  →  shared/api (fetch)
```

- **api/**: as operações GraphQL (`graphql(\`...\`)`) e funções como `signIn(input)`. É a única camada que chama o cliente.
- **hooks/**: TanStack Query em volta das funções da api: `useSignIn()`, `useRoles()`. Aqui ficam as chaves de cache e o que invalidar depois de uma mutation.
- **components/** e **pages/**: só React. Não sabem que existe GraphQL.

Uma regra do ESLint proíbe `fetch` fora de `shared/api`. Assim, se amanhã o transporte mudar, muda um arquivo.

**Por que separar hook e chamada?** A função da api é testável e reaproveitável sem React (por exemplo, no Playwright ou num loader de rota). O hook decide cache, retry e invalidação. Em entrevista: "o componente pede dados ao hook, o hook pede à api, a api pede ao cliente; cada um tem um motivo para mudar".

## GraphQL sem Apollo

Não tem Apollo nem urql. O codegen (client preset, `documentMode: 'string'`) lê os `.graphql` da API e gera, para cada operação, uma string tipada (`TypedDocumentString<Resultado, Variáveis>`). O cliente faz um POST com essa string e o TypeScript sabe o formato da resposta.

- O cache é do TanStack Query, por chave (`['me']`, `['roles']`), não normalizado por id como no Apollo. Para uma dashboard isso basta: depois de uma mutation, invalida a chave e pronto.
- Nenhum runtime GraphQL vai para o navegador (o bundle fica menor).
- Se a API mudar o schema e quebrar uma operação, o `npm run codegen` ou o `typecheck` falham no mesmo PR.

## Sessão e refresh

Detalhes no [ADR 6](../docs/adr/0006-session-in-local-storage.md). O essencial:

- A sessão fica no `localStorage`, compartilhada entre abas.
- Antes de cada chamada, `session.accessToken()` devolve o token, renovando se faltam menos de 30 segundos.
- O refresh token é de uso único e a API trata reuso como roubo. Duas abas renovando juntas derrubariam a sessão. Por isso o refresh roda sob um **Web Lock** e relê o storage dentro dele: a segunda aba encontra o token novo e não renova de novo.
- Se a API responder `UNAUTHENTICATED` mesmo assim (token expirado no meio do caminho, relógio do computador adiantado ou segredo trocado no servidor; um JWT não é revogado), o cliente força um refresh e tenta uma vez; se falhar de novo, limpa a sessão e os guards mandam para `/entrar`.
- Quando a sessão acaba, por qualquer motivo e em qualquer aba, o cache do TanStack Query é apagado. Num computador do balcão, a próxima pessoa não vê nada do usuário anterior.
- Se outra aba sair enquanto esta renovava o token, o token novo é descartado: a sessão não volta sozinha.
- Sair de propósito não guarda "voltar para"; sessão expirada guarda (`/entrar?voltar=/servicos`).

## Rotas e papéis

Papel vem dos dados, como na API: `myBarberProfile` e `myBarbershop` numa query só (`useRoles`).

- `/` não tem tela: manda o barbeiro para `/agenda`, o dono para `/barbearia` e os outros para `/comecar`.
- `RequireAuth` protege tudo que precisa de login. `RequireRole` protege páginas de barbeiro e de dono e redireciona quem não tem o papel.
- `RedirectIfSignedIn` tira quem já está logado das telas de login e é ele que leva para o `?voltar` depois do login (o formulário só cria a sessão; assim não há duas navegações disputando).

## Formulários

React Hook Form + zod. O schema zod repete os limites da API (`shared/lib/limits.ts`) para mostrar o erro antes de ir ao servidor. A API continua sendo a autoridade: o código de erro dela (`EMAIL_TAKEN`) vira mensagem em português (`shared/lib/error-messages.ts`) e cai no campo certo quando dá.

## Visual

A paleta vem do logo: fundo `#312E38`, laranja `#FF9000` como único destaque, texto `#F4EDE8`. Roboto Slab (a fonte do "Awesome / Haircuts & Shaves" do logo) nos títulos e Archivo no resto. Só tema escuro, porque é o fundo da própria marca. Os componentes são do shadcn: o código fica no repositório (`shared/ui`), em cima do Radix, que cuida de acessibilidade (foco, teclado, ARIA).

## Perguntas prováveis

- **Por que Vite e não Next?** Tudo fica atrás de login, não há SEO nem conteúdo público para renderizar no servidor. Um SPA estático é mais simples de rodar.
- **Por que não Redux/Zustand?** O estado que importa é do servidor, e o TanStack Query cuida dele. O resto é estado de formulário (React Hook Form) ou de URL (data do dia na agenda).
- **Como evita dois refresh ao mesmo tempo?** Promise compartilhada dentro da aba e Web Lock entre abas, relendo o storage dentro do lock.
