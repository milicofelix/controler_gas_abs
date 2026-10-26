# PWA — Fase 1: tela inicial operacional

## Entrega

A tela inicial foi isolada em `operational/features/dashboard` e passou a consumir somente estado calculado e comandos fornecidos pelo orquestrador operacional.

## Conteúdo do dashboard

- nível estimado e estado atual;
- dias de uso, dias restantes e média;
- previsão de término;
- alerta prioritário;
- botijão atual e situação da reserva;
- ações rápidas para troca, reserva, lembrete e histórico;
- indicador online/offline.

## Limites preservados

O dashboard não cria ciclos nem movimenta estoque diretamente. Trocas continuam passando pela transição de domínio centralizada, e a configuração detalhada permanece na tela de estoque até a Fase 2.

## Critérios concluídos

- perguntas operacionais respondidas no primeiro painel;
- nível, duração, previsão e média identificados;
- média real diferenciada da referência inicial;
- botijão atual e reserva visíveis;
- alerta prioritário e atalhos operacionais;
- cabeçalho compacto;
- navegação inferior fixa;
- áreas de toque com pelo menos 48 px no dashboard;
- `safe-area` aplicada ao shell, carregamento e navegação;
- skeleton de carregamento durante a sincronização inicial;
- estado orientado para residência sem botijão;
- indicador online/offline.

## Teste manual

### 1. Abrir o ambiente correto

O Docker publica dois endereços diferentes:

- `http://localhost:8090`: Vite em desenvolvimento, lendo o código atual de `src`;
- `http://localhost:8092`: servidor da API, que pode entregar o `dist` antigo.

Para conferir as mudanças sem gerar um novo build, abra obrigatoriamente:

```text
http://localhost:8090
```

Se o ambiente não estiver iniciado:

```bash
docker compose up -d gas_app
```

Esse comando inicia o ambiente existente; não é necessário executar `npm run build`.

### 2. Evitar cache ou aba antiga

1. Feche abas antigas abertas em `localhost:8092`.
2. Abra `http://localhost:8090` em uma nova aba.
3. Faça uma atualização forçada no navegador:
   - macOS: `Command + Shift + R`;
   - Windows/Linux: `Ctrl + Shift + R`.
4. Se necessário, abra uma janela anônima em `http://localhost:8090`.

### 3. Entrar como usuário operacional

Use o acesso de usuário da residência, não o superadministrador:

```text
E-mail: casa@gas.local
Senha: casa123
```

O painel do superadministrador não recebeu as mudanças da Fase 1.

### 4. Abrir a tela inicial

Depois do login:

1. Toque no item `Início` da navegação inferior; ou
2. abra `http://localhost:8090/#home`.

### 5. Confirmar as mudanças visuais

No início da tela devem aparecer estes elementos novos:

- texto `Visão operacional`;
- estado `Acompanhamento ativo` ou `Controle ainda não iniciado`;
- indicador `Online` ou `Offline`;
- bloco `Prioridade agora`;
- bloco `Ações rápidas`;
- botões `Trocar botijão` ou `Iniciar controle`;
- botão `Usar reserva` ou `Cadastrar reserva`;
- botão `Ativar lembrete` ou `Reagendar lembrete`;
- botão `Ver histórico`.

Ao atualizar a página com uma sessão já ativa, deve aparecer brevemente a tela `Preparando sua área operacional…`, com skeleton do painel e dos indicadores.

No cartão de indicadores, confira um destes rótulos:

- `Média real`, quando há histórico suficiente;
- `Referência inicial`, quando ainda não há histórico suficiente.

Se a residência estiver sem botijão ativo, deve aparecer o card `Primeiro passo` com a ação `Iniciar controle`.

### 6. Conferir as ações rápidas

1. Toque em `Trocar botijão` e confirme que a tela muda para `Estoque`.
2. Volte para `Início` pela navegação inferior.
3. Toque em `Ver histórico` e confirme que abre `Histórico`.
4. Volte para `Início`.
5. Se existir reserva, toque em `Usar reserva` e confirme que o modal é aberto, mas cancele sem registrar a troca.
6. Toque em `Ativar lembrete` e confira a mensagem de retorno no próprio bloco de ações.

### 7. Conferir a navegação persistente

Ao mudar de tela, o endereço deve acompanhar a seção:

```text
#home
#stock
#history
#alerts
#stats
#profile
```

Atualize a página enquanto estiver, por exemplo, em `#history`. A aplicação deve continuar nessa seção depois de recarregar.

### 8. Simular o estado offline

1. Abra as ferramentas do desenvolvedor do navegador.
2. Entre na aba `Network`.
3. Altere a conexão para `Offline`.
4. O indicador do dashboard deve mudar de `Online` para `Offline`.
5. Retorne a conexão para `No throttling` ou `Online`.

Nesta fase o indicador é apenas informativo. Cache e operação offline serão implementados nas fases específicas de infraestrutura e sincronização.
