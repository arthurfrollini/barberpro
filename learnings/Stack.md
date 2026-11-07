# A stack do BarberPro, peça por peça

Para cada tecnologia: o que ela é, o que faz aqui e por que foi escolhida no lugar da alternativa óbvia. A ideia é conseguir explicar qualquer linha do `package.json` numa entrevista.

O repositório tem três pacotes: a **API** na raiz (`src/`), a **dashboard** em `web/` e o **app do cliente** em `mobile/`. Eles conversam só por HTTP: GraphQL em `/graphql`, uploads em `/uploads`, imagens em `/files/:id`.

```
navegador ── dashboard (React, Vite) ── HTTP / SSE ── API (Fastify + GraphQL Yoga)
                                                       ├── PostgreSQL + PostGIS (dados)
                                                       ├── Redis (filas e pub/sub)
                                                       └── worker (emails e lembretes) ── SMTP (Mailpit em dev)
```

---

## Base

### Node.js 24

O runtime de JavaScript no servidor, na versão LTS atual (fixada no `.nvmrc`). A API e o worker rodam nele. A dashboard também usa Node, mas só para as ferramentas (Vite, testes); no navegador roda o JavaScript que o Vite gera.

### TypeScript (modo `strict`)

JavaScript com tipos checados antes de rodar. Aqui ele é o que mais segura o projeto: os tipos do GraphQL são gerados do schema (veja Codegen), então um resolver ou uma tela que usa um campo que não existe nem compila. Na API usamos ESM com `NodeNext` (imports terminam em `.js`); na web, `moduleResolution: bundler`, porque quem resolve os imports é o Vite.

### ESLint e Prettier

ESLint aponta erros e padrões ruins; Prettier só formata. Duas regras do ESLint são de arquitetura:

- na API, `domain/` e `application/` não podem importar Fastify, TypeORM, GraphQL, Redis nem `adapters/` (é o que garante o hexagonal);
- na web, só `shared/api` pode chamar `fetch` (é o que garante "hooks e chamadas separadas").

---

## API

### Fastify

O servidor HTTP. Rápido, com plugins bem feitos (`@fastify/multipart` para upload) e TypeScript de primeira. Escolhido no lugar do Express (sem tipos de verdade, middleware solto) e do NestJS (muito framework para quatro módulos; a arquitetura aqui é nossa, não do framework).

### GraphQL e GraphQL Yoga

**GraphQL** é a linguagem de consulta: o cliente pede exatamente os campos que quer, num endpoint só. **Yoga** é o servidor GraphQL, montado dentro do Fastify em `/graphql`. Escolhido no lugar do Apollo Server por ser leve, seguir o padrão Fetch e já trazer subscriptions por SSE. Detalhes em [GraphQL](GraphQL.md).

Onde GraphQL atrapalha, ficou REST: `GET /health` (o Docker e o monitoramento esperam HTTP simples) e `POST /uploads` (um arquivo é um corpo HTTP, não um campo de JSON).

### GraphQL Code Generator (lado do servidor)

Lê os arquivos `.graphql` e gera os tipos dos resolvers (`src/shared/adapters/graphql/generated`). Com os **mappers**, o resolver devolve o objeto de domínio (`Appointment`) e o TypeScript confere campo a campo. O CI falha se o gerado estiver desatualizado.

### DataLoader

Junta as buscas de um mesmo "tique" numa query só. Sem ele, uma lista de 20 agendamentos com `barber { name }` faria 21 queries (o famoso N+1). Um DataLoader novo por requisição, para o cache não vazar entre usuários.

### zod

Valida dados de fora em tempo de execução. Na API, valida o `.env` na subida: se faltar `JWT_SECRET`, o processo nem sobe, em vez de quebrar no primeiro login. Na web, valida os formulários.

### PostgreSQL 17

O banco. Tudo fica nele, inclusive notificações (ADR 3, "só Postgres"). As três extensões:

- **PostGIS**: coordenadas como `geography`, para "barbearias perto de mim" com índice espacial.
- **pg_trgm**: busca por nome que tolera erro de digitação ("barbaria" acha "Barbearia").
- **btree_gist**: permite as **exclusion constraints** que impedem dois agendamentos sobrepostos. São três: por barbeiro, por cliente e, desde a V2, por pessoa (um barbeiro em duas barbearias também não pode estar em dois lugares). É o banco, não o código, a última barreira contra corrida.

### TypeORM

O ORM (mapeia tabelas para classes). Usado com disciplina: `synchronize` desligado, migrations escritas à mão em SQL, e decorators só nas classes `*Record` da camada de persistência. Um mapper converte `Record ↔ domínio`, então o domínio não sabe que o TypeORM existe. Foi decisão do Arthur no design. Prisma seria a alternativa óbvia: ótima experiência de uso, mas o schema próprio dele atrapalha justamente o que este projeto mais usa, exclusion constraints e PostGIS, que aqui são SQL escrito à mão nas migrations.

### Redis, ioredis e BullMQ

**Redis** é um banco em memória. Aqui ele não guarda dados de negócio; tem dois papéis:

- **Fila de jobs (BullMQ)**: o envio de email e os lembretes vão para uma fila; o **worker** (`src/worker.ts`, outro processo) consome. A API responde rápido e um SMTP fora do ar não derruba a reserva. Lembrete é um job atrasado (`delay`) com id `reminder-<id>`, então remarcar substitui e cancelar remove.
- **Pub/sub das subscriptions**: quando um agendamento muda, a API publica no Redis; todas as instâncias da API recebem e repassam pelo SSE. Com duas instâncias atrás de um load balancer, o barbeiro conectado na outra também recebe.

**ioredis** é o cliente Redis do Node; o BullMQ usa ele por baixo.

### argon2

Hash de senha (argon2id), o vencedor da Password Hashing Competition. Lento e caro em memória de propósito, o que dificulta força bruta. Senha nunca é guardada nem logada.

### jose (JWT)

Gera e confere o **access token** (JWT HS256, 15 minutos). O **refresh token** não é JWT: é um valor aleatório guardado com hash, de uso único e rotativo; reusar um token já trocado é sinal de roubo e revoga todas as sessões da pessoa. Detalhes em [Autenticação](Autenticacao.md).

### nodemailer e Mailpit

**nodemailer** manda email por SMTP. Em desenvolvimento o SMTP é o **Mailpit**, que captura tudo e mostra numa página (http://localhost:8025). Nenhum email real sai, e os testes do Playwright leem o código do convite pela API do Mailpit.

### Vitest (API)

O runner de testes, em três projetos: `unit` (domínio e casos de uso com repositórios em memória e relógio fixo), `integration` (repositórios contra Postgres de verdade, inclusive testes de corrida) e `e2e` (operações GraphQL pelo app HTTP). Detalhes em [Testes e CI](Testes-e-CI.md).

---

## Dashboard

### Vite

O servidor de desenvolvimento e o empacotador. Sobe em milissegundos, recarrega só o módulo alterado e, no build, gera arquivos estáticos. Em dev ele também é **proxy**: `/graphql`, `/uploads` e `/files` vão para a API, então o navegador vê uma origem só e a API não precisa de CORS. Next.js não fez sentido: tudo fica atrás de login, não há página pública para renderizar no servidor (ADR 5).

### React 19

A biblioteca de interface. Componentes como funções, estado com hooks. Nada de Server Components aqui (é SPA).

### React Router 8 (modo data)

As rotas: `createBrowserRouter` com rotas aninhadas. Os **guards** (`RequireAuth`, `RequireRole`) são rotas sem caminho que decidem entre renderizar o `<Outlet />` ou redirecionar. O dia da agenda fica na URL (`?dia=2026-11-02`), então dá para voltar, recarregar e compartilhar.

### TanStack Query

O **estado do servidor**: busca, cache, revalidação, retry. Cada query tem uma chave (`['agenda', barberId, dia]`); depois de uma mutation, o hook invalida as chaves afetadas e a tela recarrega sozinha. É por isso que a dashboard não tem Redux nem Zustand: o estado que importa vem do servidor, e o resto é de formulário ou de URL. Detalhes em [Agenda no front](Agenda-no-Front.md).

### GraphQL Code Generator (lado do cliente) e graphql-sse

O **client preset** lê os `.graphql` da API e os documentos escritos em `features/*/api/*.ts` e gera, para cada operação, uma string tipada (`TypedDocumentString<Resultado, Variáveis>`). Um cliente `fetch` de ~100 linhas manda essa string; o resultado já vem tipado. Sem Apollo: menos bundle, cache simples por chave.

**graphql-sse** é o cliente das subscriptions por server-sent events, o protocolo que o Yoga fala. Envolvido por uma camada que reabre o stream quando ele termina sem a tela pedir (token velho depois de dormir, Wi-Fi caindo) e que o troca por um novo quando a rede volta ou o aparelho acorda, porque um stream morto pode parecer aberto.

### React Hook Form e zod

Formulários sem re-render a cada tecla, com validação por schema zod. O zod também transforma o que a pessoa digita no que a API quer ("45,50" vira `4550` centavos). Detalhes em [Formulários](Formularios.md).

### Tailwind CSS 4

CSS por classes utilitárias, direto no JSX. As cores e fontes da marca são **tokens** (`--primary: #ff9000`) em `src/index.css`; os componentes usam o token (`bg-primary`), nunca a cor solta. Trocar a paleta é mudar um arquivo. Um teste confere o contraste dos tokens de erro (WCAG AA).

### shadcn/ui e Radix

**Radix** são componentes sem estilo que resolvem a parte difícil de acessibilidade: foco preso no diálogo, Esc fecha, navegação por teclado no menu, atributos ARIA. **shadcn/ui** é um gerador que copia componentes prontos (Radix + Tailwind) para dentro do projeto (`src/shared/ui`). O código é nosso: dá para mudar à vontade, sem esperar uma biblioteca.

### lucide-react, sonner e Fontsource

Ícones (lucide), toasts (sonner) e as fontes da marca servidas pelo próprio app (Fontsource: Roboto Slab, a do logo, e Archivo), sem depender do Google Fonts.

### Vitest, Testing Library, jsdom e MSW (web)

- **jsdom** imita o navegador dentro do Node.
- **Testing Library** acha elementos como um usuário: pelo rótulo, pelo papel ("o botão Entrar"). Se o teste não acha pelo rótulo, um leitor de tela também não acharia.
- **MSW** intercepta as requisições de rede e responde como a API responderia. Componente, hook, chamada e cliente rodam de verdade; só o servidor é falso.

Vitest em vez de Jest: mesma API (`describe`, `it`, `expect`), mas usa a transformação do próprio Vite, sem Babel. Detalhes em [Testes no front](Testes-no-Front.md).

### Playwright

Testes ponta a ponta num Chromium de verdade, contra a API de verdade: o Playwright sobe a API (porta 4100, banco de teste), o worker e o Vite (porta 5181). Cobre login, agenda ao vivo, configuração do barbeiro, convite lido do Mailpit e, na V2, a troca de barbearia.

---

## App do cliente (mobile)

### Expo e Expo Router

**Expo** é o jeito padrão de fazer app React Native hoje: sem pastas `ios/` e `android/` para manter, com módulos prontos (localização, armazenamento seguro, fontes) e o **Expo Go**, que roda o app no celular ou no simulador sem compilar nada nativo. O app só usa módulos que vêm no Expo Go de propósito. **Expo Router** faz as rotas por arquivo em `src/app/`, como o Next.js, com abas (`(tabs)/`) e pilha. Detalhes em [App do cliente](App-Mobile.md) e no ADR 8.

### React Native e Hermes

React Native desenha componentes nativos (`View`, `Text`, `Pressable`) em vez de HTML. O JavaScript roda no **Hermes**, o motor do React Native, que não é o Node: falta `Intl.RelativeTimeFormat`, por exemplo, e foi isso que quebrou o app na primeira vez no simulador.

### expo-secure-store e expo-location

**SecureStore** guarda a sessão no Keychain (iOS) ou no Keystore (Android), não em texto puro. **expo-location** pede a permissão e lê a posição para "barbearias perto de você".

### O que vem do dashboard

TanStack Query, React Hook Form com zod, GraphQL Code Generator (client preset) e o mesmo jeito de organizar features. A diferença está na base: `StyleSheet` com tokens da marca em `shared/ui/theme.ts` em vez de Tailwind, e `@expo-google-fonts` em vez de Fontsource.

### Jest, React Native Testing Library e Playwright

**Jest com jest-expo** é o que a Expo documenta para testar React Native. **React Native Testing Library** acha elementos pelo rótulo e pelo papel, como a do web. A rede é um `fetch` falso injetado no cliente real. O **Playwright** testa o build web do app contra a API de verdade.

---

## Infra de desenvolvimento

### Docker Compose

`docker compose up` sobe tudo: Postgres com PostGIS, Redis, Mailpit, a API (rodando as migrations antes), o worker e a dashboard, com recarga ao salvar. Detalhes em [Docker](Docker.md).

### GitHub Actions

O CI em cada PR: na API, codegen sem diferença, lint, tipos, formatação, testes unitários, de integração e e2e (com Postgres e Redis como serviços) e build; na web, o mesmo mais o Playwright com Postgres, Redis e Mailpit; no app, codegen, lint, tipos, formatação, testes, build web e o Playwright no build web.

---

## Perguntas prováveis

- **Por que tanta coisa para um app de agenda?** Cada peça resolve um problema concreto do domínio: exclusion constraint para dois agendamentos no mesmo horário, fila para email não travar a reserva, pub/sub para a agenda ao vivo com mais de uma instância. O que não resolvia nada ficou de fora: microserviços, CQRS, Redux, Apollo.
- **O que você trocaria primeiro se fosse para produção?** O refresh token num cookie httpOnly (ADR 6) e observabilidade (logs estruturados já existem; faltam métricas e tracing).
