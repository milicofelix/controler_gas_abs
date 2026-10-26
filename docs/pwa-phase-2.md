# Fase 2 — Operação de botijões

## Resultado

A antiga área genérica de estoque foi substituída por uma tela de **Operação**, com jornadas independentes para:

- iniciar o controle do primeiro botijão;
- realizar uma troca;
- cadastrar ou substituir uma reserva;
- remover uma reserva.

A troca encerra o ciclo atual exclusivamente por `replaceActiveCylinder`. Cadastrar, substituir ou remover uma reserva altera somente o estoque e o histórico da reserva.

Todas as jornadas possuem validação de datas, resumo, confirmação explícita em bottom sheet, cancelamento sem alteração do estado, feedback e proteção contra submissão duplicada.

## Teste manual

Use o endereço normal do projeto e entre com um usuário de teste. Na navegação inferior, abra **Operação**.

### 1. Iniciar controle

Este cenário exige um usuário sem botijão ativo.

1. Toque em **Iniciar controle**.
2. Informe uma data de instalação futura e confirme que a tela impede o avanço.
3. Informe uma data válida, marca e, opcionalmente, o valor.
4. Toque em **Revisar operação**.
5. Confira o resumo e use **Voltar e editar** para confirmar que os campos permanecem preenchidos.
6. Revise novamente e toque uma única vez em **Confirmar operação**.
7. Confirme que o botijão aparece como ativo e nenhum ciclo encerrado foi criado.

### 2. Cancelar sem alterar dados

1. Abra qualquer jornada e preencha alguns campos.
2. Toque em **Cancelar**, no botão `×` ou fora do bottom sheet.
3. Confirme que botijão atual, histórico e reserva continuam iguais.

### 3. Cadastrar reserva

1. Com um botijão ativo, toque em **Cadastrar reserva**.
2. Informe marca, data da compra e valor.
3. Revise e confirme.
4. Confirme que a reserva aparece como disponível.
5. Confirme que a data de instalação do botijão atual e a quantidade de ciclos encerrados não mudaram.

### 4. Substituir reserva

1. Com uma reserva disponível, toque em **Substituir reserva**.
2. Cadastre os dados do novo botijão, informe o motivo da substituição e confirme o resumo.
3. Confirme que o novo botijão passa a ser a reserva disponível.
4. No histórico de reservas, confirme que a reserva anterior aparece como substituída.
5. Confirme que o ciclo atual continua intacto.

### 5. Remover reserva

1. Toque em **Remover reserva**.
2. Tente avançar sem motivo e confirme a validação.
3. Informe o motivo, revise e confirme.
4. Confirme que a reserva deixou de estar disponível e que a movimentação registra o motivo.
5. Confirme que nenhum ciclo de consumo foi criado.

### 6. Trocar usando a reserva

1. Cadastre uma reserva e toque em **Realizar troca**.
2. Informe data posterior à instalação atual e selecione o motivo.
3. Escolha **Botijão reserva** como origem.
4. Confira no resumo o ciclo encerrado, motivo, origem, marca e valor do novo botijão.
5. Confirme a operação.
6. Confirme que há exatamente um novo ciclo no histórico, a reserva virou o botijão em uso e o estoque de reserva ficou vazio.

### 7. Trocar por compra direta

1. Toque em **Realizar troca**.
2. Selecione **Compra direta**.
3. Informe marca e valor do novo botijão.
4. Revise e confirme.
5. Confirme que exatamente um ciclo foi encerrado e que o novo botijão está ativo com os dados informados.

### 8. Trocar por outro botijão

1. Repita a jornada escolhendo **Outro botijão**.
2. Revise a origem exibida no resumo e confirme.
3. Confirme que somente uma troca foi registrada.

### 9. Validação da data de troca

1. Abra **Realizar troca**.
2. Informe a mesma data da instalação ou uma data anterior.
3. Confirme que a jornada não permite revisar.
4. Informe uma data futura e confirme que também é rejeitada.

### 10. Acesso rápido pelo dashboard

1. Volte para **Início**.
2. Toque em **Trocar botijão** e confirme que a tela **Operação** é aberta.
3. Com uma reserva disponível, toque em **Usar reserva**.
4. Confirme que a jornada de troca abre com **Botijão reserva** selecionado.

## Observação de validação técnica

Nesta fase foi feita somente revisão estática. Build, lint e testes automatizados permanecem reservados para a Fase 10.
