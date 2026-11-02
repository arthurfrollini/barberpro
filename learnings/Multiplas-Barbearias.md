# V2: várias barbearias por pessoa

Na v1, cada pessoa tinha no máximo uma barbearia como dona e atendia em no máximo uma. Na vida real, barbeiro atende em dois lugares e dono abre filial. A V2 tira esse limite sem mudar o modelo, só a quantidade.

## O modelo

```
users ──1:N── barbershops (dono)                  um dono, várias barbearias
  │                │
  └──1:N── barbers ┘  (perfil de barbeiro: uma pessoa, uma barbearia)
              │
              ├──1:N── services            preço e duração por barbearia
              ├──1:N── weekly_intervals    horários por barbearia
              ├──1:N── blocked_dates       folgas por barbearia
              └──1:N── appointments        cada um guarda barber_id e barber_user_id
```

- **Perfil de barbeiro por barbearia.** O José que atende na Mega e no Centro tem dois perfis (`barbers`), cada um com seus serviços, preços, horários, folgas, bio e foto. O índice único virou `barbers (user_id, shop_id) WHERE removed_at IS NULL`: uma vez por barbearia, quantas barbearias quiser.
- **Dono de várias.** Saiu a restrição `UNIQUE (owner_id)` de `barbershops`.

## A regra nova: ninguém está em dois lugares

Com dois perfis, o José podia ser reservado às 14h na Mega e às 14h no Centro. Não pode. Duas camadas garantem:

1. **Na disponibilidade.** `availableSlots` desconta os horários ocupados da **pessoa** (`busyFor(barberUserId, ...)`), em todas as barbearias dela. O Centro nem oferece as 14h.
2. **No banco.** A tabela `appointments` ganhou `barber_user_id` e uma terceira exclusion constraint:

```sql
ALTER TABLE appointments ADD CONSTRAINT appointments_barber_user_no_overlap
  EXCLUDE USING gist (barber_user_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (status = 'booked');
```

Duas reservas simultâneas, uma em cada barbearia, passam pela checagem de disponibilidade ao mesmo tempo; a segunda a gravar leva o erro do Postgres, que vira `SLOT_UNAVAILABLE`. O teste de integração `races.test.ts` faz exatamente isso com duas requisições em paralelo.

Por que guardar `barber_user_id` no agendamento em vez de buscar pelo `barber_id`? Porque a exclusion constraint só olha colunas da própria linha. É uma cópia de propósito (como a cópia do serviço com preço e duração), e o perfil nunca muda de dono.

O que **não** é compartilhado: folga e horário. Bloquear segunda na Mega não bloqueia o Centro.

## A API ficou explícita

Antes, "a minha barbearia" e "o meu perfil" eram implícitos. Agora toda operação de dono ou barbeiro diz sobre qual:

| v1                           | V2                               |
| ---------------------------- | -------------------------------- |
| `myBarbershop`               | `myBarbershops` (lista)          |
| `myBarberProfile`            | `myBarberProfiles` (lista)       |
| `becomeBarber`               | `becomeBarber(shopId)`           |
| `inviteBarber(email)`        | `inviteBarber(shopId, email)`    |
| `createService(input)`       | `createService(barberId, input)` |
| `barberAgenda(date)`         | `barberAgenda(barberId, date)`   |
| `subscription agendaChanged` | `agendaChanged(barberId)`        |

O servidor confere se o id é do usuário: barbearia de outra pessoa responde `NOT_SHOP_OWNER`, perfil de outra pessoa `NOT_A_BARBER`, **exista o id ou não**. Assim cada operação tem uma resposta só para "isso não é seu", e o cliente não precisa tratar dois casos que para ele são o mesmo.

## Na dashboard: workspaces e o seletor

Cada barbearia em que a pessoa é dona ou atende é um **workspace**: a barbearia, se ela é dona, e o perfil de barbeiro dela ali (se houver). A lista sai de uma query (`myBarbershops` + `myBarberProfiles`) e é montada por uma função pura, `buildWorkspaces`, testada sem React.

- **O seletor** fica no canto inferior esquerdo da barra lateral (e no menu do celular). Mostra a barbearia ativa e, ao abrir, todas as outras com o papel ("Dono", "Barbeiro", "Dono e barbeiro"), mais "Nova barbearia" e "Aceitar convite".
- **A escolha é por aba e por usuário.** Cada aba guarda a sua (`sessionStorage`), então dá para ter a Mega numa aba e o Centro na outra sem uma puxar a outra. A última escolha também fica no `localStorage`, por usuário, e é o ponto de partida da próxima aba. Se a barbearia escolhida sumir (a pessoa saiu da equipe), cai na primeira em que ela atende, depois na primeira de que é dona.
- **Com mais de uma barbearia, o sino diz de qual** é cada notificação.
- **Cada tela age sobre a ativa.** Agenda, horários, serviços e perfil usam o perfil de barbeiro dali; Barbearia e Equipe usam a barbearia. A navegação mostra só o que o papel naquela barbearia permite.
- **Sem mistura.** As chaves de cache levam o id (`['agenda', barberId, dia]`), e a página remonta ao trocar (`<Outlet key={shopId} />`). Uma tela nunca mostra dados da barbearia anterior por um instante.
- **Criar ou entrar troca a ativa.** Nova barbearia criada, convite aceito: ela vira a ativa e a tela já abre nela.
- **Notificação de outra barbearia** troca para ela antes de abrir a agenda do dia.

Uma pegadinha que apareceu: o `onSuccess` passado para `mutate()` não roda se o componente desmontar. Aceitar convite troca a barbearia ativa, isso remonta a página, e o "Bem-vindo à equipe" sumia. A correção foi usar `await mutateAsync()` e fazer o toast e a navegação depois.

## Perguntas prováveis

- **Por que não um campo "barbearia atual" no usuário, no servidor?** Seria estado de tela guardado no banco: duas abas em barbearias diferentes brigariam. A API fica sem estado (cada chamada diz o id) e a escolha é do navegador.
- **Como você garante que um barbeiro em dois lugares não é reservado duas vezes?** A disponibilidade já desconta os dois lugares, e uma exclusion constraint por pessoa no Postgres pega a corrida que passar pela checagem. Tem teste de integração com duas reservas em paralelo.
- **Migration em produção?** A coluna nova é preenchida a partir de `barbers.user_id` antes de virar `NOT NULL`, e a constraint é criada depois. Numa tabela grande, eu preencheria em lotes antes do `NOT NULL`; e a exclusion constraint cria um índice gist e confere todas as linhas (não aceita `NOT VALID`), então pediria uma janela tranquila. Aqui cabe numa migration só.
