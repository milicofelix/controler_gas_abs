# Fase 4 — Alertas e lembretes

## Resultado

A área de alertas agora é uma central acionável. Os alertas podem encaminhar o usuário para cadastro de reserva, uso da reserva, troca, início do controle, reagendamento ou cancelamento do lembrete.

Tipos tratados:

- previsão de término próxima;
- nível crítico;
- ausência de reserva;
- necessidade de comprar reposição;
- lembrete agendado;
- falha de sincronização ou conexão.

A solicitação de permissão ocorre somente depois da ação explícita do usuário e de uma tela explicativa. Se a permissão for negada ou o ambiente não suportar agendamento em segundo plano, o lembrete visual continua ativo dentro do aplicativo.

## Teste manual geral

1. Entre como usuário comum e abra **Alertas**.
2. Confira o total de alertas e os cartões de ação recomendada.
3. Confirme que cada botão abre a jornada correspondente na tela **Operação**.

## Cenários operacionais

### Sem reserva

1. Remova ou use a reserva atual.
2. Volte aos alertas.
3. Confirme o alerta **Nenhuma reserva disponível**.
4. Toque em **Cadastrar reserva** e confirme que o bottom sheet de cadastro abre automaticamente.

### Nível crítico com reserva

1. Use dados que deixem a estimativa em 10% ou menos e mantenha uma reserva cadastrada.
2. Confirme o alerta **Nível crítico**.
3. Toque em **Usar reserva** e confirme que a jornada de troca abre com a origem reserva selecionada.

### Término próximo e reposição

1. Use dados cuja previsão esteja a sete dias ou menos.
2. Confirme o alerta de previsão próxima.
3. Sem reserva, confirme também o alerta de compra de reposição.

### Falha de sincronização

1. Desative a conexão do dispositivo ou interrompa a API.
2. Confirme o alerta **Falha de sincronização**.
3. Confirme que o sistema informa que os dados continuam salvos localmente.

## Permissão e lembrete

1. Com botijão ativo, toque em **Ativar lembrete** no dashboard ou na central.
2. Confirme que a explicação aparece antes da permissão do sistema.
3. Toque em **Agora não** e confirme que nenhuma permissão é solicitada.
4. Abra novamente e toque em **Continuar e permitir**.
5. Negue a permissão e confirme a mensagem de alternativa visual.
6. Confirme que o lembrete aparece na central com opções **Reagendar** e **Cancelar**.
7. Cancele e confirme que o alerta agendado desaparece.

## Matriz manual de ambientes

### Navegador desktop/mobile

- confirmar que a permissão só aparece após a confirmação;
- confirmar o texto de alternativa visual;
- confirmar ativação, reagendamento e cancelamento no estado do aplicativo.

### Android / Capacitor

- permitir notificações e confirmar o agendamento nativo;
- negar e confirmar o lembrete visual;
- cancelar e confirmar a remoção da notificação nativa.

### iOS / Capacitor

- repetir permissão concedida e negada;
- confirmar o agendamento local fora do aplicativo;
- conferir safe-area do bottom sheet.

### PWA instalada

- abrir em modo standalone;
- confirmar que a central identifica o ambiente como Navegador/PWA;
- confirmar que a alternativa visual funciona mesmo sem capacidade de agendamento em segundo plano.

## Validação técnica

Foi realizada somente revisão estática. Build, lint e testes automatizados permanecem reservados para a Fase 10.
