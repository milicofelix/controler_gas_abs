# Fase 3 — Histórico operacional

## Resultado

O histórico agora é apresentado em uma linha do tempo consolidada. Os dados continuam armazenados separadamente:

- `history`: ciclos encerrados e trocas;
- `reserveHistory`: compras e movimentações da reserva.

Uma compra de reserva sempre aparece como compra. Quando essa mesma reserva é usada, removida ou substituída, a linha do tempo apresenta também um segundo evento de movimentação. Dessa forma, compra não é tratada como troca.

Novas trocas armazenam motivo e origem do novo botijão em campos estruturados. Registros antigos continuam compatíveis e têm essas informações inferidas das observações quando possível.

## Teste manual

### 1. Linha do tempo completa

1. Entre como usuário comum e abra **Histórico**.
2. Confirme que os eventos aparecem do mais recente para o mais antigo.
3. Confira as cores e títulos diferentes para ciclo encerrado, compra, uso, remoção e substituição de reserva.
4. Confirme que uma compra de reserva não aparece com o título de troca.

### 2. Filtro Todos

1. Selecione **Todos**.
2. Confirme que ciclos, compras e movimentações de reserva aparecem juntos.

### 3. Filtro Trocas

1. Selecione **Trocas**.
2. Confirme que aparecem somente os ciclos encerrados.
3. Confirme que compras de reserva não aparecem.

### 4. Filtro Compras

1. Selecione **Compras**.
2. Confirme que aparecem somente os registros de compra de reserva.

### 5. Filtro Reservas

1. Selecione **Reservas**.
2. Confirme que aparecem somente uso, remoção e substituição de reservas.
3. Confirme que a compra original não é confundida com a movimentação posterior.

### 6. Filtro por período

1. Informe as datas **De** e **Até**.
2. Confirme que somente eventos dentro do intervalo permanecem visíveis.
3. Toque em **Limpar período** e confirme o retorno de todos os eventos do filtro selecionado.

### 7. Detalhes de um ciclo

1. Toque em um evento **Ciclo encerrado**.
2. Confira instalação, término, duração, marca, valor, motivo e origem do novo botijão.
3. Em registros antigos, confira se motivo e origem são recuperados das observações quando disponíveis.
4. Feche pelo botão `×` ou tocando fora do bottom sheet.

### 8. Detalhes de uma reserva

1. Toque em uma compra ou movimentação de reserva.
2. Confira data do evento, compra, marca, valor, situação e motivo/observação.

### 9. Compatibilidade com novas operações

1. Na tela **Operação**, realize uma troca e escolha a origem do novo botijão.
2. Volte ao histórico e abra o novo ciclo.
3. Confirme que o motivo e a origem correspondem exatamente ao que foi informado.
4. Cadastre, substitua, use ou remova uma reserva e confirme os eventos correspondentes na linha do tempo.

## Ações futuras

Corrigir, excluir, restaurar e exportar período aparecem como ações previstas e permanecem desabilitadas. Nenhuma delas altera dados nesta fase.

## Validação técnica

Foi realizada apenas revisão estática. Build, lint e testes automatizados permanecem reservados para a Fase 10.
