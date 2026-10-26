# Fase 5 — Análises e indicadores

## Resultado

A tela de análises foi transformada em um módulo mobile com indicadores de consumo, custos, tendência, comparação por marca e gráficos responsivos.

Os cálculos utilizam somente ciclos considerados válidos. São excluídos:

- duração igual ou inferior a zero;
- duração não numérica;
- ciclos acima de 180 dias;
- ciclos cuja duração não corresponde ao intervalo entre instalação e término.

O filtro analítico não modifica o histórico. Registros preservados pela normalização continuam visíveis, mas deixam de influenciar projeções, alertas e indicadores.

## Teste manual

### Sem histórico

1. Entre com um usuário sem ciclos encerrados.
2. Abra **Análises**.
3. Confirme a referência inicial de 35 dias identificada como estimativa.
4. Confirme os estados vazios de preços, marcas e gráficos.

### Indicadores de consumo

1. Use um usuário com ciclos válidos.
2. Confira média, menor ciclo, maior ciclo e consumo anual estimado.
3. Confirme que os valores reais exibem a identificação **Dados reais**.
4. Compare manualmente a média com as durações apresentadas no histórico.

### Tendência

1. Com menos de seis ciclos, confirme o estado **Aguardando dados**.
2. Com seis ou mais ciclos, confira a comparação entre três ciclos recentes e três anteriores.
3. Confirme as mensagens de consumo acelerando, estável ou rendimento melhorando.

### Indicadores financeiros

1. Registre valores em pelo menos dois ciclos.
2. Confira valor médio e variação do preço.
3. Confirme que gasto mensal e anual aparecem identificados como estimativas.
4. Confirme que essas projeções usam a duração média real quando disponível.

### Gráficos responsivos

1. Confira os gráficos de duração e preço em largura de celular.
2. Verifique se data, barra e valor permanecem legíveis sem rolagem horizontal.
3. Repita em orientação paisagem e desktop.

### Comparação por marca

1. Registre ciclos de pelo menos duas marcas.
2. Confira quantidade de ciclos, média, menor e maior duração.
3. Confirme que a barra mais longa corresponde à maior média.

### Proteção contra registros anormais

1. Importe uma cópia de teste contendo um ciclo acima de 180 dias ou incompatível com as datas.
2. Abra **Análises**.
3. Confirme o aviso com a quantidade de registros excluídos.
4. Confirme que esses registros continuam visíveis no histórico, mas não alteram médias, gráficos ou marcas.

## Validação técnica

Foi realizada apenas revisão estática. Build, lint e testes automatizados permanecem reservados para a Fase 10.
