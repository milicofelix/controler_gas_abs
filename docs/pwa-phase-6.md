# Fase 6 — Perfil, configurações e backup

## Resultado

A tela foi reorganizada em quatro grupos:

- **Residência:** responsável, nome, cidade, estado, WhatsApp, e-mail, senha e foto;
- **Aparência:** preferência de cores e tema claro/escuro;
- **Dados:** exportação, importação, sincronização, ciclos, limpeza local e restauração remota;
- **Aplicativo:** versão, instalação, atualização e permissão de notificações.

## Importação segura

O arquivo é validado antes da substituição. O resumo informa:

- quantidade de ciclos;
- movimentações de reserva;
- duplicidades;
- inconsistências;
- existência de botijão ativo;
- disponibilidade de reserva.

Ao confirmar, o aplicativo baixa automaticamente uma cópia do estado atual e somente depois aplica o novo arquivo.

## Teste manual

### Residência

1. Abra **Perfil**.
2. Altere responsável, residência, cidade, estado ou WhatsApp.
3. Selecione uma foto e salve.
4. Saia e entre novamente para confirmar a persistência.

### Aparência

1. Alterne entre os temas.
2. Confirme que Escuro Premium utiliza modo escuro.
3. Confirme que os outros temas utilizam modo claro com cores diferentes.

### Exportação

1. Toque em **Exportar backup**.
2. Confirme o download do JSON com data, usuário e estado operacional.

### Importação válida

1. Toque em **Selecionar backup** e escolha um JSON válido.
2. Confira o resumo antes da substituição.
3. Confirme a quantidade de ciclos, reservas, duplicidades e inconsistências.
4. Toque em **Criar cópia e importar**.
5. Confirme o download do backup anterior e a aplicação dos novos dados.

### Importação inválida

1. Selecione JSON malformado, sem histórico ou com estoque em formato inválido.
2. Confirme que a importação é bloqueada.
3. Use um arquivo com ciclos repetidos ou inconsistentes e confirme o alerta no resumo.

### Limpeza local

1. Toque em **Limpar dados locais**.
2. Leia a confirmação e cancele para verificar que nada muda.
3. Confirme e verifique a mensagem de que servidor e sessão atual não foram apagados.

### Restauração do servidor

1. Toque em **Restaurar do servidor**.
2. Cancele uma vez e confirme que os dados atuais permanecem.
3. Confirme a restauração com a API ativa.
4. Repita com a API indisponível e confirme o feedback de erro.

### Aplicativo

1. Confira versão e status de instalação.
2. No navegador, confira as instruções para iPhone e Android/desktop.
3. Se o navegador oferecer o evento de instalação, use **Instalar aplicativo**.
4. Confira o status da permissão de notificações.
5. Abra como PWA instalada ou Capacitor e confirme o status correspondente.

## Validação técnica

Foi realizada somente revisão estática. Build, lint e testes automatizados permanecem reservados para a Fase 10.
