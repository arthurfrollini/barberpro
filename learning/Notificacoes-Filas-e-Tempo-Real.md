# Notificações, filas e tempo real — BarberPro (fase 4)

## O fluxo

```
bookAppointment ──commit──▶ evento "booked" (porta SchedulingEvents)
                                   │
                    handleSchedulingEvents (módulo notifications)
                 ┌─────────────────┼──────────────────────┬─────────────────────┐
                 ▼                 ▼                      ▼                     ▼
   linha em notifications   job na fila "mail"   job atrasado "reminders"   Redis pub/sub
      (lista no app)        (worker → SMTP)      (worker → lembrete)     (subscription agendaChanged)
```

- **A agenda não conhece notificações.** Ela só publica eventos (`booked`, `canceled`, `rescheduled`, com quem agiu). O módulo de notificações é o adaptador dessa porta. Trocar email por push é só mais um adaptador.
- **Quem recebe:** quem **não** agiu. Reserva vai para o barbeiro. Cancelamento ou remarcação vai para o outro lado. Se foi a agenda do barbeiro (dia bloqueado, novo horário, saída da barbearia), o cliente recebe o motivo ("the barber blocked that day").
- **Falha em notificar não derruba a reserva.** O evento sai depois do commit; se o Redis cair, o erro é logado e a reserva continua valendo. O passo seguinte, se isso importasse muito, seria um _transactional outbox_ (gravar o evento na mesma transação e publicar depois). Para o v1 ficou de fora de propósito.

## Fila (BullMQ) e o worker

- A API **só enfileira**. Um segundo processo (`src/worker.ts`, serviço `worker` no Docker Compose) consome as filas. Assim um SMTP lento nunca deixa uma requisição lenta.
- Fila `mail`: 5 tentativas com backoff exponencial. O convite de barbeiro (fase 2) também passou a usar essa fila.
- Fila `reminders`: um **job atrasado** por agendamento, com id `reminder-<id do agendamento>`. Agendar de novo substitui o anterior; cancelar remove. Remarcar = remover + agendar no novo horário.
- **O job relê o agendamento antes de mandar.** Se foi cancelado, ou se o job é de um horário antigo, ele não manda nada. Isso cobre a corrida entre "remover o job" e "o job já começou".
- Lembrete cujo horário já passou (reservou 10 min antes com aviso de 15) nem é agendado.
- `QUEUE_PREFIX` separa as chaves no Redis; os testes usam `barberpro-test` e limpam no início.

## Tempo real: `agendaChanged`

- Subscription GraphQL: o barbeiro abre o stream e recebe cada mudança da própria agenda. O Yoga entrega por **SSE** (Server-Sent Events, HTTP comum). WebSocket ainda não está ligado.
- A autorização roda **uma vez, ao abrir o stream**: sem token dá `UNAUTHENTICATED`, e quem não é barbeiro recebe `NOT_A_BARBER`. Cada barbeiro tem o próprio tópico (`agendaChanged:<barberId>`), então não tem como ouvir a agenda de outro.
- O pub/sub passa pelo **Redis**, não pela memória do processo. Com duas instâncias da API, a reserva feita numa chega no barbeiro conectado na outra.
- A mensagem leva só o id do agendamento; o resolver carrega o resto com DataLoader. Mandar o objeto inteiro pelo Redis exigiria serializar e reconstruir a classe de domínio.
- O teste e2e sobe o servidor numa porta de verdade, assina via SSE, faz uma reserva e lê o primeiro evento.

## O que a revisão do PR pegou

1. **Agenda ao vivo com dado velho.** O Yoga cria um contexto por subscription, então o DataLoader vivia o stream inteiro e guardava a primeira leitura: um cancelamento aparecia como "marcado às 14:00". Agora cada evento limpa o cache do agendamento antes de carregar. O teste lê três eventos seguidos.
2. **Reserva travada com o Redis fora do ar.** A conexão das filas esperava o Redis voltar; o cliente dava timeout, tentava de novo e recebia `SLOT_UNAVAILABLE` para a própria reserva. A API agora usa uma conexão que falha rápido (sem fila offline) e desiste de enfileirar em 2 segundos. Os workers continuam com a conexão que espera.
3. **API caindo numa queda do Redis.** O adaptador de pub/sub do Yoga não trata erro de `publish`/`subscribe`; a promise rejeitada sem tratamento derrubava o processo. Os clientes Redis agora são "protegidos" e reportam o erro.
4. **Convite travado.** Com o email na fila, uma falha de SMTP não chegava mais ao `inviteBarber`. Agora o email leva o id do convite, e quando o worker desiste (última tentativa) o convite é revogado; o dono pode mandar de novo.
5. **Um passo derrubava os outros.** Lembrete, notificação e agenda ao vivo agora são passos separados, cada um com o próprio tratamento de erro.

## Prova manual

Com `docker compose up`, uma reserva feita pelo GraphQL gerou o email "New booking" no Mailpit (http://localhost:8025), enviado pelo worker, e o job do lembrete ficou no conjunto de atrasados do Redis.

## Frase para entrevista

"Scheduling only publishes domain events; notifications is the adapter behind that port. The API writes the in-app row and enqueues; a separate BullMQ worker sends email with retries and fires reminders as delayed jobs keyed by appointment id, so rescheduling just replaces the job, and the job re-reads the appointment before sending. Barbers get their agenda live through a GraphQL subscription over Redis pub/sub, so it works across instances."
