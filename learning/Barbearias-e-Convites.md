# Barbearias e convites — BarberPro (fase 2)

## O modelo

```
users ──1:1── barbershops (dono)        a página da barbearia: vitrine
  │                 │
  │                 ├──1:N── barbers ──1:N── services   cada barbeiro tem os seus
  │                 │
  │                 └──1:N── invites                     convites por email, 7 dias
  └──1:N── files (logo, foto)
```

- **Um usuário, vários papéis.** Ser dono vem de ter uma linha em `barbershops`; ser barbeiro vem de ter uma linha ativa em `barbers`. Não existe coluna `role`.
- **Barbeiro é uma "matrícula" na barbearia.** Remover não apaga a linha (`removed_at`), porque os agendamentos antigos (fase 3) apontam para ela. O índice único parcial `barbers (user_id) WHERE removed_at IS NULL` garante uma barbearia ativa por barbeiro e libera a pessoa para entrar em outra depois.
- **Serviço é do barbeiro**, não da barbearia: o José cobra R$ 50 por 15 minutos e o João R$ 60 por 30 no mesmo lugar. Preço em centavos (`priceCents`), duração em minutos múltiplos de 5 (de 5 a 480). Arquivar esconde da lista, mas mantém o histórico.

## "Barbearias perto de mim" com PostGIS

A coluna `location` é `geography(Point, 4326)`: um ponto em latitude e longitude no sistema do GPS (WGS 84). Com `geography`, as funções medem em **metros na superfície da Terra**.

```sql
SELECT s.*, ST_Distance(s.location, :ponto) / 1000 AS distance_km
FROM barbershops s
WHERE ST_DWithin(s.location, :ponto, :raio_em_metros)   -- usa o índice gist
ORDER BY distance_km
LIMIT :limit
```

- `ST_DWithin` filtra pelo raio e usa o índice `gist (location)`. Sem índice, o banco calcularia a distância para todas as barbearias.
- O raio vai até 50 km e a página até 50 itens, para uma consulta nunca virar "me dá o Brasil inteiro".
- Teste de integração com pontos reais: Paulista, Pinheiros (~3,8 km) e Itaquera (~20 km).
- O dono manda latitude e longitude junto com o endereço. Transformar endereço em coordenada (geocoding) precisa de uma API paga; fica para depois.

## Busca por nome com trigramas

`pg_trgm` quebra o texto em pedaços de 3 letras e compara. `word_similarity('barbaria', 'mega barbearia sp')` dá 0,64, então o operador `<%` (limite 0,6) encontra a barbearia mesmo com erro de digitação. O índice `gin (lower(name) gin_trgm_ops)` atende o operador. Limitação conhecida: acento conta como letra diferente ("barbearia" e "barbeária"); resolver isso pede a extensão `unaccent`.

## Fluxo do convite

1. O dono chama `inviteBarber(email)`. A API gera um código aleatório, guarda **só o hash** e manda o email ("You were invited to join Mega Barbearia SP") com o código e um link para a dashboard (`DASHBOARD_URL/convite?codigo=...`), que já abre com o código preenchido.
2. O convidado cria conta (ou entra) **com aquele email** e chama `acceptInvite(token)`.
3. A API confere: o convite existe, não foi usado nem revogado, não passou de 7 dias, o email de quem está logado é o do convite, e a pessoa não é barbeira ativa em nenhum lugar. Aí cria a linha em `barbers`.

Regras extras: um convite pendente bloqueia outro igual (`INVITE_ALREADY_SENT`), um vencido é substituído, e o dono pode revogar. Convite por SMS ou WhatsApp ficou fora do v1 porque precisa de um provedor pago.

**O que a revisão do PR pegou** (e virou teste):

- Um "salvar" que reescrevia a linha inteira deixava uma cópia velha desfazer uma remoção ou uma revogação. Agora `removed_at`, `accepted_at` e `revoked_at` só são gravados uma vez (`COALESCE` no upsert), e aceitar é um `UPDATE ... WHERE accepted_at IS NULL AND revoked_at IS NULL` na mesma transação que cria o barbeiro.
- Se o email do convite falhasse, o convite ficava pendente sem ninguém ter o código, bloqueando um novo envio por 7 dias. Agora ele é revogado e o dono recebe `EMAIL_NOT_SENT`.

No banco, o índice único parcial `invites (shop_id, email) WHERE accepted_at IS NULL AND revoked_at IS NULL` impede dois convites abertos mesmo com duas requisições ao mesmo tempo.

## Uploads (REST)

`POST /uploads` (logado, multipart) devolve `{ id, url }`; as mutations recebem o id (`logoFileId`, `avatarFileId`). Ficou REST porque arquivo é corpo HTTP puro; mandar upload por GraphQL exige uma especificação à parte.

- O tipo é detectado pelos **bytes** (magic numbers), não pelo nome: um HTML renomeado para `.png` volta 415.
- Máximo de 2 MB (413 acima disso). JPEG, PNG ou WebP.
- `GET /files/:id` é público (logo e foto aparecem para qualquer pessoa), com `nosniff` e cache longo, já que o arquivo de um id nunca muda.
- Só quem enviou o arquivo pode usá-lo como logo ou foto (`FILE_NOT_FOUND` para o arquivo de outra pessoa).

## DataLoader na prática

A busca `searchBarbershops { barbers { name services { name } } }` com 3 barbearias faria, sem DataLoader, 1 + 3 (barbeiros) + N (nomes) + N (serviços) queries. Com DataLoader são no máximo 4, e um teste conta as queries para garantir (`loads barbers and services in batches`). Os loaders ficam em `modules/shops/adapters/graphql/loaders.ts` e são criados a cada requisição.

## Frase para entrevista

"Nearby search is PostGIS: a geography column with a gist index, ST_DWithin for the radius and ST_Distance for ordering. Name search uses pg_trgm word similarity, so typos still match. Invites are single-use codes stored as hashes, and partial unique indexes enforce one open invite per email and one active shop per barber, even under concurrent requests."
