# Push notifications (V4)

O aviso chega no celular com o app fechado, e o toque abre o agendamento. Antes disso, o app só ficava sabendo de uma mudança aberto: Avisos consultava a API a cada minuto.

## O caminho de um push

```
barbeiro cancela no dashboard
  → API grava o aviso (notifications) e põe na fila: email e push
  → worker pega o push: tokens do cliente + número de não lidos
  → POST https://exp.host/--/api/v2/push/send (até 100 por requisição)
  → Expo repassa para a Apple (APNs) ou o Google (FCM)
  → celular mostra "Agendamento cancelado"; o toque abre /agendamento/<id>
15 min depois: worker lê os recibos e esquece os celulares que sumiram
```

## Os pedaços

- **Token por aparelho, não por pessoa.** A tabela `push_tokens` tem o token da Expo como chave. Um celular que entra com outra conta passa para a nova pessoa (upsert pelo token), então ninguém recebe aviso de outra pessoa. Sair da conta descadastra o token antes de limpar a sessão.
- **Fila, como o email.** `notify()` põe o email e o push na fila lado a lado; se um falhar ao entrar na fila, o outro segue. A requisição que causou o aviso nunca espera a Expo.
- **Cliente próprio da API da Expo**, com `fetch`, sem SDK: manda de 100 em 100, lê recibos de 1000 em 1000. 429 e 5xx viram erro, e o BullMQ tenta de novo com espera crescente.
- **Ticket e recibo.** A Expo responde na hora com um _ticket_ por mensagem (aceitou ou não). O _recibo_, com a resposta da Apple ou do Google, sai minutos depois; a Expo recomenda olhar depois de 15. Nos dois, `DeviceNotRegistered` quer dizer que o app foi desinstalado ou os avisos desligados: o token é apagado.
- **Badge** é o número de não lidos na hora do envio, então o ícone bate com a aba Avisos.
- **Texto em português.** O email e o aviso salvo continuam em inglês (decisão antiga), mas o push é lido na lista de notificações do celular, onde o app não traduz nada.

## No app

- **Development build em vez do Expo Go.** O Expo Go não recebe push remoto. `npx expo run:ios` compila e instala um app próprio, com os módulos nativos que o projeto usa; depois, `npm start` só serve o JavaScript.
- **Pedir na hora certa.** Nunca na abertura do app: o pedido aparece na tela "Agendado", logo depois do primeiro agendamento, quando o motivo é óbvio. Um "não" é respeitado; Conta tem o botão, e leva para os Ajustes quando o celular já negou.
- **`PushDevice`**, como o `LocationSource`: uma interface sobre o `expo-notifications`. Os testes passam um aparelho falso que responde à permissão, dá token, simula um push chegando e um toque.
- **Toque com o app fechado.** O toque que abriu o app chega por `lastTap()` e às vezes também pelo listener. O app guarda o id e abre uma vez só. E só abre caminhos internos (`/agendamento/...`): uma URL de fora no payload é ignorada.
- **Sair sem rede.** O descadastro no logout tem até 3 segundos. Sem rede, a pessoa sai mesmo assim; o servidor apaga o token quando a Apple ou o Google disserem que ele sumiu.

## Credenciais

Para chegar num iPhone de verdade, a Expo precisa da chave APNs (conta paga de Apple Developer); para Android, de um projeto no Firebase (FCM). Elas ficam na Expo (`eas credentials`), não no código. Sem elas, a Expo aceita a mensagem mas não entrega.

Como testar sem elas:

- o servidor, contra um servidor HTTP falso no lugar da Expo (`EXPO_PUSH_URL`);
- o app, no simulador do iOS, com `xcrun simctl push <aparelho> <bundle id> payload.json`, que entrega uma notificação direto ao app, sem APNs.

## Frase para entrevista

"Push goes through Expo's push service, so one sender covers iOS and Android. The API stores one token per device, keyed by the token, so a shared phone moves to whoever signs in last, and sign-out unregisters it. Every notification queues a push next to the email, the worker sends batches of 100 with the unread count as the badge, and both the immediate tickets and the receipts 15 minutes later prune dead tokens. The app asks for permission right after the first booking, not at launch, and a tap opens the appointment, also from a cold start."
