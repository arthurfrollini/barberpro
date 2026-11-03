# Dashboard: formulários

Todos os formulários usam **React Hook Form** (estado do formulário) com **zod** (regras), ligados pelo `zodResolver`.

## O básico

```ts
const schema = z.object({
  email: z.string().trim().min(1, 'Informe seu email.').pipe(z.email('Email inválido.')),
  password: z.string().min(1, 'Informe sua senha.'),
});
const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
```

- Os campos são **não controlados** (`register`): o RHF guarda os valores dele, atualizados pelos eventos de mudança, sem re-renderizar o formulário a cada tecla.
- `FormField` (`shared/ui/form-field.tsx`) liga label, campo, dica e erro por `id`, `aria-invalid` e `aria-describedby`. É por isso que os testes conseguem achar o campo com `getByLabelText('Email')`.
- `noValidate` no `<form>`: quem valida é o zod, com mensagens em português, não o navegador.

## Limites espelhados da API

`shared/lib/limits.ts` repete os limites da API (nome até 80, bio até 500, duração de 5 a 480...). Assim o erro aparece antes de ir ao servidor. A API continua sendo a autoridade: o código de erro dela vira mensagem em português (`shared/lib/error-messages.ts`) e, quando é sobre um campo, cai nele (`EMAIL_TAKEN` no email).

## Entrada diferente da saída

O preço é digitado como "45,50" e vai para a API como `4550` centavos. O zod faz isso com `transform`:

```ts
price: z.string().transform((value, ctx) => {
  const cents = parseBRL(value);
  if (cents === null || cents <= 0) {
    ctx.addIssue({ code: 'custom', message: 'Use um valor como 45 ou 45,50.' });
    return z.NEVER;
  }
  return cents;
}),
```

Com isso o tipo do formulário tem dois lados: `useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>`. O formulário guarda texto; o `handleSubmit` entrega números.

## Listas que crescem: `useFieldArray`

O horário semanal é um formulário com 7 dias, cada um com N intervalos. Cada dia usa `useFieldArray({ name: 'days.0.intervals' })`, que dá `append`, `remove` e um `id` estável por item (usado como `key`, nunca o índice).

Regras que olham mais de um campo (intervalos que se sobrepõem) ficam num `superRefine` no schema inteiro. Cada problema é preso no campo certo pelo `path`, e a mensagem diz o dia: "Os intervalos de segunda se sobrepõem". Como a mensagem fica num campo mas depende de outro, depois da primeira tentativa de salvar qualquer mudança num intervalo revalida o dia inteiro (`trigger`), e a mensagem some assim que o problema é corrigido.

## Só o que mudou

- `formState.isDirty` desabilita "Salvar" quando nada mudou. Em Horários isso não basta: ligar e desligar um dia deixa nele o intervalo que ganhou, então o form fica "sujo" sem nada para salvar. Lá o botão compara o que seria enviado à API (`fromForm`) com o que veio dela.
- Editar um serviço manda só os campos alterados (`changes(service, values)`), o que deixa claro no log e na API o que a pessoa mudou.
- A foto do perfil tem três estados: não mexeu (não manda nada), trocou (manda o id do arquivo novo), removeu (manda `null`). O upload acontece quando a pessoa escolhe a imagem; o formulário só carrega o id.

## Upload no meio do formulário

A foto sobe quando a pessoa escolhe o arquivo. Enquanto sobe, o `ImageField` avisa o formulário (`onUploadingChange`) e o "Salvar" fica desabilitado: senão daria para salvar a bio antes de a foto existir, ver "Perfil salvo" e perder a foto.

## Depois de salvar

`form.reset(valoresQueOServidorDevolveu)`: o formulário volta a "limpo" com os dados que de fato ficaram salvos. Se a API normalizou algo (cortou espaços, por exemplo), a tela mostra o valor real.

## Perguntas prováveis

- **Por que React Hook Form e não estado com `useState`?** Menos re-render, validação pronta com zod e listas dinâmicas (`useFieldArray`) sem reinventar.
- **Por que validar no front se a API valida?** Para responder na hora, no campo certo, sem ida ao servidor. A validação do front é conforto; a da API é a regra.
- **Como evitar que front e API discordem?** Os limites de tamanho ficam em `limits.ts` e as regras de horário em `weekly-form.ts`, escritas a partir das da API. O front pode ser mais rígido de propósito (preço maior que zero, até R$ 10.000), nunca mais frouxo. E os erros da API são mapeados pelo código, então uma regra nova na API ainda aparece (com a mensagem genérica) até alguém traduzir.
