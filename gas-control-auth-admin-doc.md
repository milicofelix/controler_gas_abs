# Patch — Login local e Super Admin

## O que foi analisado

O projeto já estava bem avançado até a fase 7: visual mobile, cálculo inicial de 35 dias, histórico, média móvel, alertas, backup/importação e Capacitor para mobile híbrido.

A lacuna principal era arquitetura de usuário. O estado anterior era single-user e ficava em uma chave única de localStorage, o que impedia separar o consumo por casa e impossibilitava um dashboard geral.

## O que foi implementado

- Tela de login antes do dashboard do botijão.
- Cadastro local de novos usuários/casas.
- Separação do consumo por usuário/casa.
- Sessão local para manter o usuário logado.
- Usuário comum acessa somente a própria casa.
- Super admin acessa dashboard geral com todas as casas cadastradas.
- Dashboard admin com casas, média geral, quantidade em estado baixo/crítico, ciclos totais, previsão, média e recomendação de compra por casa.
- Migração do estado antigo `gas-control-state-v1` para o usuário demo inicial, quando existir.
- README atualizado com acessos e chaves de localStorage.

## Acessos iniciais

```text
Usuário comum: casa@gas.local / casa123
Super admin: admin@gas.local / admin123
```

## Importante

Esta autenticação é local e serve para validar fluxo, navegação e regra de negócio no MVP 100% JavaScript. Para produção, a próxima etapa recomendada é criar backend/API com autenticação real, persistência em banco e senha com hash.

## Validação executada

```bash
npm run lint
npm test
npm run build
```

Todos passaram.
