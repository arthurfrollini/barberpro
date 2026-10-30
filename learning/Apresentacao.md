# Apresentação — BarberPro

## Roteiro de demo (5 minutos)

1. **`docker compose up`**: sobem Postgres com PostGIS, Redis, Mailpit, a API e o worker. Abrir o GraphiQL em http://localhost:4000/graphql e o Mailpit em http://localhost:8025.
2. **Dono:** `signUp`, `createBarbershop` (com latitude e longitude), `becomeBarber`, `createService` (Corte, R$ 60, 30 min), `setWeeklySchedule` com 10:00-12:00 e 14:00-22:00.
3. **Convite:** `inviteBarber("jose@...")`. Mostrar o email no Mailpit. O José cria conta e chama `acceptInvite` com o código.
4. **Cliente sem conta:** `barbershopsNearby` e `searchBarbershops(query: "barbaria")`, com erro de digitação. Depois `availableSlots`: nenhum horário no almoço, e 11:45 não aparece porque o corte terminaria 12:15.
5. **Reserva:** em outra aba, o barbeiro abre `subscription { agendaChanged }`. O cliente chama `bookAppointment` e o evento chega ao vivo. A notificação aparece em `notifications`, e o email "New booking" chega no Mailpit.
6. **Regras:** tentar reservar o mesmo horário com outra conta dá `SLOT_UNAVAILABLE`. `blockDate` cancela os horários a 2 horas ou mais e devolve quais foram cancelados.
7. **Código:** `availability.ts` (uma função para listar e validar), a migration com `EXCLUDE USING gist` e o teste de corrida em `races.test.ts`.

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
A dashboard web do barbeiro (agenda do dia ao vivo, horários, serviços, convites) e depois o app do cliente com push no lugar do email.
