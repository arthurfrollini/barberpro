# Apresentação — BarberPro

## Roteiro de demo (5 minutos)

1. **`docker compose up`**: sobem Postgres com PostGIS, Redis, Mailpit, a API e o worker. Abrir o GraphiQL em http://localhost:4000/graphql e o Mailpit em http://localhost:8025.
2. **Dono:** `signUp`, `createBarbershop` (com latitude e longitude), `becomeBarber(shopId)`, `createService(barberId, ...)` (Corte, R$ 60, 30 min), `setWeeklySchedule(barberId, ...)` com 10:00-12:00 e 14:00-22:00.
3. **Convite:** `inviteBarber(shopId, "jose@...")`. Mostrar o email no Mailpit. O José cria conta e chama `acceptInvite` com o código.
4. **Cliente sem conta:** `barbershopsNearby` e `searchBarbershops(query: "barbaria")`, com erro de digitação. Depois `availableSlots`: nenhum horário no almoço, e 11:45 não aparece porque o corte terminaria 12:15.
5. **Reserva:** em outra aba, o barbeiro abre `subscription { agendaChanged(barberId: ...) }`. O cliente chama `bookAppointment` e o evento chega ao vivo. A notificação aparece em `notifications`, e o email "New booking" chega no Mailpit.
6. **Regras:** tentar reservar o mesmo horário com outra conta dá `SLOT_UNAVAILABLE`. `blockDate` cancela os horários a 2 horas ou mais e devolve quais foram cancelados.
7. **Código:** `availability.ts` (uma função para listar e validar), a migration com `EXCLUDE USING gist` e o teste de corrida em `races.test.ts`.

## Roteiro da dashboard (5 minutos)

1. **`docker compose up`** e http://localhost:5180. Criar conta: cai em **Começar**.
2. **Tenho uma barbearia:** preencher o formulário e "Usar minha localização". Cai em **Barbearia**; clicar "Atender também" e mostrar a navegação ganhando Agenda, Horários e Serviços.
3. **Horários:** ligar segunda a sábado; quebrar um dia em dois intervalos e mostrar o erro de sobreposição com o nome do dia. Salvar. Bloquear um dia.
4. **Serviços:** criar "Corte" por R$ 45, 30 min.
5. **Equipe:** convidar um email, abrir o Mailpit, clicar no link em outra janela anônima, criar conta, o código já vem preenchido, aceitar.
6. **Agenda ao vivo:** `npm run seed:demo` em `web/` cria um barbeiro com agendamentos. Entrar com ele, deixar a agenda aberta e reservar pela API (GraphiQL) com outra conta: o bloco aparece, o toast e o sino também, sem recarregar.
7. **Cancelar e remarcar** pelo painel lateral; mostrar os botões travados a menos de 2 horas e o motivo.
8. **V2, várias barbearias:** pelo seletor no canto inferior esquerdo, "Nova barbearia". Mostrar a lista com os papéis ("Dono", "Dono e barbeiro"), trocar e ver a navegação mudar. Depois, pela API, tentar reservar o mesmo barbeiro às 14h nas duas barbearias: a segunda leva `SLOT_UNAVAILABLE`.
9. **Código:** `features/agenda/lib/timeline.ts` (funções puras com teste), `shared/api/session.ts` (refresh com Web Lock entre abas), `shared/api/subscriptions.ts` (stream que se reabre) e um teste do Playwright.

## Perguntas prováveis

**Por que GraphQL aqui, se seus outros projetos são REST?**
São dois clientes com necessidades diferentes (dashboard e app), e o schema vira a documentação. Ficou REST onde GraphQL atrapalha: health check e upload de arquivo.

**Por que arquitetura hexagonal? Não é exagero?**
A agenda tem regra de verdade (encaixe no horário, 2 horas, fuso, concorrência) e precisa de teste sem banco e sem relógio. O resto é simples e ficou simples: sem CQRS, sem event sourcing, sem container de injeção. O ESLint garante que o domínio não importa framework.

**Como você garante que não há dupla reserva?**
Em três camadas. O domínio só aceita um horário que a própria função de horários livres listaria. O Postgres tem uma exclusion constraint (`tstzrange` com `&&`, via `btree_gist`) que recusa sobreposição mesmo com duas requisições no mesmo milissegundo. E as mudanças de agenda travam a linha do barbeiro, para uma reserva não cair num dia recém-bloqueado. Cada camada tem um teste de corrida.

**E fuso horário?**
O banco guarda UTC; a barbearia tem um fuso IANA. A conversão usa `Intl`, com horário de verão tratado no modo "compatible" do Temporal. Um 22:30 em São Paulo é 01:30Z do dia seguinte e continua aparecendo na agenda do dia certo.

**O que acontece se o Redis cair no meio de uma reserva?**
A reserva já foi gravada. O evento sai depois do commit, e falha ao notificar é logada, nunca derruba a reserva. O próximo passo, se precisasse de garantia de entrega, seria um transactional outbox.

**Como funcionam os lembretes?**
Job atrasado no BullMQ com id fixo por agendamento: remarcar substitui o job, cancelar remove. O job relê o agendamento antes de mandar, então um job velho não manda nada.

**O que a revisão de código pegou?**
Cada fase teve uma revisão independente do branch inteiro. Os achados que viraram teste e correção:

- Duas corridas de refresh token (fase 1).
- Gravação que desfazia uma remoção (fase 2).
- Reagendamento que ressuscitava um agendamento cancelado (fase 3).
- Reserva caindo em dia bloqueado (fase 3).
- Horário de verão (fase 3).

**O que você faria diferente?**
Eu travaria a linha do barbeiro desde o primeiro desenho da agenda. A exclusion constraint resolve sobreposição, mas não "o dia acabou de ser bloqueado", e isso só apareceu na revisão.

**Próximo passo?**
O app do cliente (busca, reserva, lembretes), com push no lugar do email. A API e a dashboard já cobrem o lado da barbearia.

**Por que a dashboard não usa Apollo?**
O cache que importa é por tela, não por entidade. TanStack Query com chaves simples resolve, e o codegen tipa cada operação como string, sem runtime GraphQL no navegador. Menos coisa para explicar e para carregar.

**Como você garante que front e API não quebram um ao outro?**
A dashboard lê os `.graphql` da API no codegen. Uma mudança no schema que quebra uma operação falha o `typecheck` da dashboard no mesmo PR. E o Playwright roda contra a API de verdade no CI.
