# App do cliente (V3)

O app que o cliente usa para achar uma barbearia, marcar, cancelar e remarcar. Fica em `mobile/`, feito com Expo e Expo Router, e fala com a mesma API GraphQL do dashboard. A V3 não mudou nada na API: tudo que o cliente precisa já existia (`barbershopsNearby`, `availableSlots`, `bookAppointment`, `myAppointments`, `rescheduleSlots`...).

## As telas

```
abas:   Explorar · Agendamentos · Avisos (com o número de não lidos) · Conta
pilha:  barbearia/[id] → barbeiro/[id] → agendar → agendamento/[id] → remarcar/[id]
        entrar, criar-conta (com ?voltar= para voltar de onde veio)
```

- **Explorar** pede a localização uma vez. Com ela, lista as barbearias a até 10 km, da mais perto para a mais longe. Sem ela (negou ou falhou), diz isso e a busca por nome continua funcionando.
- **Agendar** mostra os próximos 60 dias numa faixa, os horários livres numa grade e o lembrete. Olhar não exige conta; confirmar exige.
- **Agendamento** aparece como um ingresso: a barbearia, o horário grande em Roboto Slab, a data, o serviço e o preço.

## Arquitetura: o mesmo desenho do dashboard

```
src/app/            só rotas: leem os params e renderizam a tela da feature
src/features/<f>/   api/ (operações e funções de request), hooks/ (TanStack Query),
                    components/, screens/, lib/
src/shared/         api/ (cliente, sessão, erros), ui/ (tema e componentes), lib/
```

- As funções em `api/` são o único código que chama a rede. Elas recebem o cliente como parâmetro (`fetchShop(api, id)`), e o hook pega o cliente do contexto (`useApi()`). É isso que deixa o teste trocar a rede sem mock de módulo.
- Uma regra do ESLint impede `screens/` e `components/` de importar de `api/` (só tipos passam).
- Codegen lê os `.graphql` da API, como no dashboard. Se a API mudar um campo que o app usa, o CI do app quebra no mesmo PR.

## O rascunho do agendamento mora na URL

Dia, horário e lembrete ficam nos params da rota (`/agendar?barbeiro=&servico=&dia=&hora=&lembrete=`), não em `useState`. Por quê: quem não tem conta toca em "Entrar para agendar", vai para `/entrar?voltar=<a url do agendar>`, cria a conta e volta com tudo escolhido. Estado de componente se perderia nessa ida e volta.

Na volta, se a tela de agendar ainda está embaixo na pilha, o login faz `router.back()` em vez de abrir outra cópia dela. O teste ponta a ponta achou essa cópia duplicada.

## Sessão no celular

- O token fica no **SecureStore** (Keychain no iOS, Keystore no Android). No web, onde ele não existe, fica no `localStorage`.
- O SecureStore é assíncrono, então a sessão é lida uma vez na abertura do app, enquanto o splash está na tela (`session.hydrate()`), e depois fica em memória. Gravações vão para o armazenamento em seguida.
- O refresh token é de uso único: a API trata um token reutilizado como roubado e derruba todas as sessões. Por isso chamadas simultâneas dividem **uma** promessa de refresh. No dashboard isso precisa de Web Lock entre abas; no app, que é uma instância só, basta a promessa.
- Sem rede, o refresh falha com `NETWORK_ERROR` e a sessão fica. Qualquer outra falha encerra a sessão.

## Dados frescos sem push

Não tem push notification (ficou para depois: precisa guardar o token Expo na API e o worker enviar). O que existe:

- O TanStack Query refaz as queries quando o app volta para a frente (`focusManager` ligado ao `AppState`).
- O número de avisos não lidos é consultado a cada minuto com o app aberto.

## Fuso horário

Os horários aparecem no fuso da **barbearia**, não do celular. Um cliente em Lisboa marcando em São Paulo vê 14:00 se o corte é às 14:00 de São Paulo. As funções de `shared/lib/time.ts` usam `Intl.DateTimeFormat` com `timeZone`, e os testes cobrem horários perto da meia-noite.

## Testes

- **Jest + jest-expo + React Native Testing Library**, o que a Expo documenta. Na versão 14, `render` e `fireEvent` são assíncronos: sem `await`, um teste vaza para o próximo.
- **Sem MSW**: a versão 3 é só ESM e não passa pela transformação do Jest do React Native. Em vez disso, um `fetch` falso responde por nome de operação (`fakeApi({ Barber: () => ({ barber }) })`) e é injetado no cliente real. Cliente, hooks e telas rodam de verdade; só o servidor é falso.
- **Navegação** com `renderRouter` do `expo-router/testing-library`: dá para testar "tocar em Entrar para agendar leva a /entrar com o rascunho no voltar".
- **Ponta a ponta**: o Expo gera um build web do app. O Playwright abre esse build num Chromium do tamanho de um celular, com a localização liberada, contra a API, o worker, o Postgres e o Redis de verdade. São 4 cenários: agendar criando conta no meio, remarcar, cancelar, e o cancelamento do barbeiro aparecendo em Avisos.

## O que só o celular mostrou

Os testes rodam no Node; o app roda no **Hermes**. Na primeira vez no Expo Go (simulador do iPhone):

1. O app quebrou ao abrir: `Intl.RelativeTimeFormat` não existe no Hermes. O "há 5 minutos" passou a ser escrito à mão, e um teste impede a volta da API.
2. As linhas das listas ficaram empilhadas (logo em cima do texto): `Link asChild` não repassa um `style` em forma de função para o `Pressable`. As linhas passaram a ser `Pressable` com `router.push`.

Lição: teste verde no Node não prova que roda no celular. Abrir no simulador antes do PR pegou dois defeitos que nenhum teste pegaria.

## Frase para entrevista

"For the customer app I used Expo with Expo Router, with the same architecture as the React dashboard: feature folders, request functions as the only network code, TanStack Query for server state and types generated from the API's schema. The booking in progress lives in the route params, so it survives signing up halfway through. Tests run on Jest with a fake fetch behind the real API client, and Playwright drives the app's web build against the real API. Running it on the simulator still caught two bugs the tests could not, because Hermes is not Node."
