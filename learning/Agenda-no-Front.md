# Dashboard: a agenda

A tela principal do barbeiro. Um dia por vez, no fuso da barbearia, com o dia na URL (`/agenda?dia=2026-11-02`; sem `dia` é hoje).

## Fuso horário

A API guarda instantes em UTC e entende datas como `YYYY-MM-DD` no fuso da barbearia. O navegador do barbeiro pode estar em outro fuso (viagem, computador mal configurado), então a dashboard nunca usa o fuso do navegador para a agenda: tudo passa por `Intl.DateTimeFormat` com `timeZone` da barbearia (`shared/lib/time.ts`).

- `todayIn(tz)`: que dia é hoje lá.
- `minutesOfDay(iso, tz)`: onde o agendamento cai na linha do tempo.
- `formatShortDateTime(iso, tz)`: "seg 2/11 às 14:00", para toasts e notificações.

## A linha do tempo

Funções puras em `features/agenda/lib/timeline.ts`, testadas sem React:

- **`timelineBounds`**: do primeiro ao último horário de trabalho do dia da semana, em horas cheias; 08:00 a 20:00 numa folga. Se existe agendamento fora disso (o barbeiro mudou o horário depois), a linha cresce para mostrar.
- **`layoutColumns`**: agendamentos que se sobrepõem ficam lado a lado. Acontece quando um cancelado e o novo agendamento ocupam o mesmo horário. Algoritmo guloso: ordena por início, reaproveita a primeira coluna livre, e cada grupo de sobreposição divide a largura.

O componente só converte minutos em pixels (1,4 px por minuto, 84 px por hora). Cada agendamento é um `<li>` com um botão cujo nome acessível é "14:00 Ana, Corte" (ou ", cancelado"), o que também deixa os testes legíveis.

## Cache depois de uma mutation

Cancelar ou remarcar devolve o agendamento atualizado. O hook:

1. troca a cópia antiga em **todos** os dias em cache (`setQueriesData`), para a tela reagir na hora;
2. invalida todos os dias (`['agenda']`), porque remarcar pode tirar o agendamento de um dia e pôr em outro;
3. invalida as notificações (o cliente foi avisado).

Isso é atualização com o resultado do servidor, não "optimistic update": a tela muda depois da resposta, mas antes do refetch. No sino de notificações o "marcar como lida" é optimistic de verdade (muda antes da resposta e desfaz se der erro), porque ali errar custa pouco.

## Regra das 2 horas dos dois lados

A API recusa cancelar ou remarcar a menos de 2 horas do início (`CANCELLATION_WINDOW_CLOSED`). A dashboard repete a regra (`canChange`) só para desabilitar os botões e explicar o motivo. Se o relógio passar das 2 horas com o painel aberto, a API recusa e a mensagem em português aparece no painel. A autoridade continua sendo o servidor.

Para remarcar, a API ganhou `rescheduleSlots(appointmentId, date)`. O `availableSlots` não servia: o agendamento guarda uma cópia do serviço (nome, preço, duração) e o serviço pode ter mudado; e o próprio horário do agendamento contaria como ocupado, impedindo mover 15 minutos.

## Tempo real

A API publica `agendaChanged` por SSE (server-sent events). No front:

- `shared/api/subscriptions.ts` usa o cliente `graphql-sse` no modo "distinct connections" (o que o Yoga fala). O token é lido a cada (re)conexão, então uma conexão reaberta depois de o notebook dormir vai com token novo.
- O `graphql-sse` só tenta de novo em falha de rede. Um stream também pode terminar sozinho: a API responde `UNAUTHENTICATED` (token velho depois de uma soneca longa) e encerra, ou a renovação do token falha porque o Wi-Fi ainda não voltou. Por isso há uma camada em volta (`createSubscriber`) que abre um stream novo sempre que um termina sem a tela ter pedido, esperando até 30 s entre tentativas e renovando o token antes quando a API recusou. Para quando a tela fecha ou o usuário sai.
- `useAgendaLive` trata o evento como aviso de "olhe de novo": invalida a agenda e as notificações e mostra um toast. Não aplica o evento no cache na mão; o servidor continua sendo a fonte da verdade.
- Ao reconectar, invalida uma vez, sem toast (o que aconteceu offline aparece na agenda, não numa enxurrada de avisos).
- O próprio cancelamento do barbeiro também volta pelo stream, às vezes antes da resposta da mutation. Para não mostrar dois toasts, a aba marca o agendamento antes de enviar e lembra por 10 s o que ela mesma mudou (`lib/changed-here.ts`).

## Notificações

A API guarda o texto em inglês, porque é o mesmo do email. A dashboard monta a frase em português a partir do tipo e do agendamento, do ponto de vista de quem lê: o barbeiro lê sobre o cliente, o cliente sobre o barbeiro (`notifications/lib/describe.ts`).

O horário da frase vem de `appointmentStartsAt`, guardado na notificação no momento do evento. O agendamento pode ter mudado depois: "Novo agendamento para 14:00" continua dizendo 14:00 mesmo que o cliente tenha remarcado para 15:30 (a remarcação tem a sua própria notificação).

## Perguntas prováveis

- **Por que invalidar em vez de aplicar o evento no cache?** O evento pode chegar fora de ordem ou depois de um refetch; refazer a query é simples e sempre certo. O custo é uma requisição por evento, pequeno para uma agenda.
- **Por que SSE e não WebSocket?** É o padrão do Yoga, passa por proxies HTTP comuns e o fluxo é de mão única (servidor → navegador).
- **Como testar o tempo real?** O hook recebe a função que assina o stream (`watch`) por parâmetro; o teste passa uma falsa e emite eventos. O Playwright testa o caminho real: uma reserva feita pela API aparece na tela sem recarregar.
