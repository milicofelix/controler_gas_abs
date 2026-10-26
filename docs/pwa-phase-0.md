# PWA — Fase 0

## Limites definidos

- `App.jsx`: sessão, persistência e escolha da experiência autenticada.
- `auth/`: entrada e criação de usuário.
- `admin/`: painel administrativo, fora do shell operacional.
- `operational/`: área instalável destinada à residência.
- `components/`: elementos visuais compartilhados entre experiências.
- módulos de domínio na raiz de `src/`: cálculos e transições sem dependência da interface.

## Navegação operacional

A seção ativa é persistida no hash da URL. O shell valida as seções conhecidas e fornece uma única navegação inferior para a área operacional.

## Próximas extrações

`OperationalApp.jsx` mantém temporariamente as telas existentes para preservar o comportamento. Cada fase seguinte moverá uma tela para sua pasta em `operational/features`, sem devolver regras de negócio aos componentes visuais.

## Regra arquitetural

Componentes podem solicitar operações, mas criação de ciclos, movimentação de reserva e sincronização devem permanecer em serviços ou módulos de domínio testáveis.
