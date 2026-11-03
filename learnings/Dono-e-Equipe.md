# Dashboard: dono, barbearia e equipe

A última parte da dashboard: como alguém entra (cria a barbearia ou aceita um convite) e como o dono cuida da página e da equipe.

## Entrada guiada pelos papéis

Não existe campo "tipo de usuário". O que a pessoa é sai dos dados (`myBarbershops`, `myBarberProfiles`), igual à API. Desde a V2 isso vale **por barbearia**: a barbearia ativa no seletor decide a tela (veja [Várias barbearias](Multiplas-Barbearias.md)):

- sem barbearia e sem perfil de barbeiro → **Começar**: "Tenho uma barbearia" (abre o formulário) ou "Recebi um convite";
- dono que não atende → **Barbearia**, com o cartão "Você também atende?" (`becomeBarber`);
- barbeiro → **Agenda**.

Depois de criar a barbearia, entrar na equipe ou aceitar um convite, o papel muda. O hook espera a query de workspaces recarregar (`await invalidateQueries(['workspaces'])`) e escolhe a barbearia nova como ativa **antes** de navegar. Se navegasse antes, o guard da página de barbeiro ainda veria os papéis antigos e mandaria a pessoa de volta.

## Convite de ponta a ponta

1. O dono digita o email em **Equipe**. A API guarda só o hash do código e enfileira o email.
2. O worker manda o email com o link `DASHBOARD_URL/convite?codigo=...` (e o código, para quem prefere digitar).
3. A pessoa abre o link. Sem login, o guard manda para `/entrar?voltar=/convite?codigo=...`. O link "Criar conta" leva o mesmo `?voltar`, então depois do cadastro ela volta para o convite com o código preenchido.
4. "Aceitar convite" cria o perfil de barbeiro. Se o convite foi para outro email, a API responde `INVITE_EMAIL_MISMATCH` e a tela explica o que fazer.
5. O dono vê o convite como "Aceito" e o barbeiro na lista.

O teste do Playwright faz exatamente isso, com dois navegadores e o email lido da API do Mailpit.

## Localização

A API não faz geocoding (precisaria de serviço pago). O formulário pede latitude e longitude e oferece "Usar minha localização" (`navigator.geolocation`). Se falhar, a mensagem diz o motivo (o navegador bloqueou, o aparelho não achou a posição, ou demorou demais) e o que fazer; os campos continuam editáveis. Aceita vírgula ou ponto.

## Fuso horário

Uma lista curta com os fusos do Brasil em palavras ("Horário de Brasília", "Amazonas (1 hora a menos)"). A API aceita qualquer fuso IANA; se a barbearia já tiver um fora da lista, ele aparece como opção para não se perder ao salvar.

## Remover um barbeiro

A confirmação explica a regra antes: os agendamentos dele a 2 horas ou mais são cancelados e os clientes avisados. A API faz a remoção e os cancelamentos numa transação só.

## Atualização otimista ou confirmada?

- **Otimista** (muda a tela antes da resposta, desfaz se der erro): marcar notificação como lida. Errar custa pouco e a resposta quase nunca falha.
- **Confirmada** (espera a resposta e recarrega): criar barbearia, convidar, remover, cancelar agendamento. Envolvem regras do servidor (convite pendente, regra das 2 horas) e mexem com outras pessoas; mostrar algo que o servidor pode recusar confundiria.

## Perguntas prováveis

- **Por que o link do convite leva um código e não um token de login?** O convite não autentica ninguém: a pessoa entra com a própria conta, e a API confere se o email bate. Vazar o link não dá acesso à conta de ninguém.
- **Por que esperar a query de papéis antes de navegar?** Porque os guards decidem pela query em cache. Navegar com o cache velho manda a pessoa para a página errada.
