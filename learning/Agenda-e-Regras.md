# Agenda e regras de agendamento — BarberPro (fase 3)

A parte do projeto com regra de negócio de verdade. É aqui que o DDD tático (agregados, value objects) faz sentido.

## As peças do domínio

| Peça                | Arquivo                       | O que garante                                                                                                                                                 |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WeeklySchedule`    | `domain/weekly-schedule.ts`   | intervalos por dia da semana, em passos de 5 min, sem sobreposição; o vão entre dois intervalos é o intervalo de almoço, e um dia sem intervalos é folga fixa |
| `availableStarts()` | `domain/availability.ts`      | os horários que o cliente pode escolher                                                                                                                       |
| `Appointment`       | `domain/appointment.ts`       | cópia do serviço, regra das 2 horas, remarcar no lugar                                                                                                        |
| `parseReminderLead` | `domain/reminder-lead.ts`     | lembrete nulo ou de 5 a 60 min, de 5 em 5                                                                                                                     |
| `toUtc` / `toLocal` | `shared/domain/zoned-time.ts` | hora da barbearia ↔ instante UTC                                                                                                                              |

## Como os horários livres são calculados

Para o dia escolhido (data local da barbearia):

1. Se o dia está bloqueado, nada.
2. Para cada intervalo do dia da semana: começa no início do intervalo e anda de 15 em 15 minutos **enquanto o serviço inteiro couber** antes do fim do intervalo.
3. Tira o que já passou, o que está a mais de 60 dias e o que encosta em um agendamento existente.

Exemplo real dos testes: João trabalha 10:00-12:00 e 14:00-22:00. Um corte de 30 min tem 7 horários de manhã (10:00 a 11:30) e 31 à tarde (14:00 a 21:30). 11:45 não aparece porque terminaria 12:15, no almoço.

**A mesma função valida o agendamento.** `bookAppointment` só aceita um horário que `availableSlots` listaria. Assim o que o app mostra e o que a API aceita nunca divergem: 10:07 (fora da grade), 11:45 (não cabe) e domingo (sem expediente) dão `SLOT_UNAVAILABLE`.

## Fuso horário

- O barbeiro pensa em "segunda, 10:00"; o banco guarda instantes em UTC (`timestamptz`). A barbearia tem um fuso IANA (`America/Sao_Paulo`).
- `toUtc('2026-11-02', 22*60+30, 'America/Sao_Paulo')` dá `2026-11-03T01:30Z`: o horário das 22:30 de segunda já é terça em UTC. A agenda do dia pega o intervalo `[toUtc(data, 00:00), toUtc(data, 24:00))`, então esse horário aparece na segunda, como o barbeiro espera.
- Usei `Intl.DateTimeFormat` (que conhece as regras de horário de verão de cada fuso) em vez de uma biblioteca. O `Temporal`, que resolveria isso de forma nativa, ainda está atrás de uma flag no Node 24.
- O scalar `DateTime` agora exige `Z` ou offset (`2026-11-02T14:00:00-03:00`). Sem isso, o servidor leria a hora no fuso dele.

## A regra das 2 horas

`appointment.canBeChangedAt(now)`: o início está a 2 horas ou mais. Vale para cancelar e remarcar, do cliente e do barbeiro. Testado no limite exato: 2h00 antes pode, 1h59 não (`CANCELLATION_WINDOW_CLOSED`).

Quando a mudança vem da agenda do barbeiro (bloquear o dia, trocar o horário semanal, sair da barbearia), a regra vira um filtro: só os agendamentos a 2 horas ou mais são cancelados, e os mais próximos ficam, porque o barbeiro ainda vai atender. Tudo numa transação, e os cancelados voltam na resposta da mutation.

## Remarcar

Mesmo barbeiro, mesmo serviço, mesmo preço: só o horário muda. É um `UPDATE` da mesma linha, então ou muda tudo ou nada: se o novo horário estiver ocupado, o antigo continua valendo. O id não muda, e o lembrete (fase 4) acompanha.

## Dupla reserva: o banco tem a palavra final

A checagem do domínio roda antes, mas duas pessoas podem clicar no mesmo horário no mesmo milissegundo. Por isso a tabela tem:

```sql
CONSTRAINT appointments_barber_no_overlap
  EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (status = 'booked')
```

- `tstzrange(starts_at, ends_at)` é o intervalo de tempo; `&&` quer dizer "se sobrepõe".
- `barber_id WITH =` limita ao mesmo barbeiro. Misturar `=` com `&&` no mesmo índice gist é o que a extensão `btree_gist` permite.
- `WHERE (status = 'booked')`: cancelado não ocupa horário.
- Uma constraint igual para `customer_id` impede o cliente de marcar dois horários sobrepostos com barbeiros diferentes (`CUSTOMER_BUSY`).
- A violação (`SQLSTATE 23P01`) vira `SLOT_UNAVAILABLE` no repositório. O teste `lets exactly one of two simultaneous bookings for the same slot win` dispara duas reservas em paralelo e espera uma só.

## Eventos (gancho da fase 4)

Cada reserva, cancelamento e remarcação publica um evento (`booked`, `canceled`, `rescheduled`) numa porta `SchedulingEvents`. Na fase 3 ninguém escuta; na fase 4 eles viram notificações, emails, lembretes e a agenda ao vivo, sem mexer nos casos de uso.

## Frase para entrevista

"Availability is one pure function: every 15 minutes from the start of each working interval, as long as the whole service fits, minus blocked days, busy time, the past and anything beyond 60 days. Booking validates against that same function, and Postgres has the last word with an exclusion constraint on a tstzrange, so two concurrent bookings for the same slot can't both succeed. Times are stored in UTC and converted with the shop's IANA zone."
