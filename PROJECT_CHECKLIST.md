# Checklist do Controle Gas

## Concluido

- MVP React/Vite com Docker para desenvolvimento.
- Tela inicial com botijao P13 visual e estados cheio, medio, baixo e critico.
- Calculo inicial baseado em 35 dias.
- Responsividade mobile refinada para a tela principal.
- Controle manual com data de instalacao, data da troca, valor pago e observacoes.
- Historico salvo por usuario, com duracao real de cada botijao.
- Media dos ultimos ciclos e previsao baseada em media real quando houver historico.
- Alertas visuais para baixo e critico.
- Alertas inteligentes com compra em breve, estoque monitorado/critico, previsao e lembrete.
- Notificacao local via Capacitor quando disponivel.
- Perfil da residencia com nome, responsavel, cidade, estado e foto.
- Cadastro de marca atual, marca personalizada e upload de logo.
- Historico e media por marca.
- Estatisticas de consumo, custos, duracao, precos e tendencias.
- Dashboard admin com casas, risco, marcas e financeiro consolidado.
- Mobile hibrido com Capacitor, Android/iOS preparados, icone e splash.
- Persistencia em MySQL via API Node/Express.
- Fallback local no navegador quando a API estiver indisponivel.
- Controle basico de botijao reserva: cadastrar, remover e usar reserva.
- Cabecalho sem hora/bateria fake e logout explicito.

## Parcialmente pronto

- Controle de estoque: hoje existe apenas o status do botijao reserva. Ainda falta fluxo completo de compra/reposicao do reserva depois que ele vira o botijao em uso.
- Autenticacao: existe login funcional, mas senha ainda fica no payload do usuario. Para producao real, falta hash de senha e sessao/token no backend.
- Admin: mostra consolidado geral, mas ainda nao tem filtros por regiao, periodo ou exportacao.
- Alertas: notificacao local existe, mas falta lembrete recorrente e preferencia configuravel de dias/horario.
- Backup/exportacao: existe importacao/exportacao JSON, mas ainda nao ha backup automatico no servidor.

## Pendente recomendado

- Criar tela de estoque com dois estados claros: botijao em uso e botijao reserva.
- Registrar compra de novo botijao reserva com marca, valor e data.
- Criar endpoint de autenticacao real no backend.
- Gravar usuarios em tabelas normalizadas no MySQL futuramente, em vez de payload JSON unico.
- Adicionar migracoes versionadas do banco.
- Criar logs administrativos de alteracoes importantes.
- Adicionar testes de API para `/api/health` e `/api/users`.
- Criar tela de configuracoes de alertas.
- Melhorar icones com biblioteca visual consistente.
- Revisar textos finais e nome/logo definitivo do app.
