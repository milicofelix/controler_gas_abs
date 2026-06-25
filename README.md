# Controle Gas

Aplicativo React/Vite para acompanhar o consumo de um botijao P13, com historico local e previsao inteligente baseada nos ultimos ciclos.

## Rodar no navegador

```bash
docker compose up -d gas_app
```

Depois acesse:

```text
http://localhost:8090
```

## Build e validacao

```bash
docker compose run --rm gas_app npm run build
docker compose run --rm gas_app npm run lint
```

## Mobile hibrido

O app usa Capacitor com:

- Android em `android/`
- iOS em `ios/`
- assets fonte em `resources/icon.svg` e `resources/splash.svg`
- assets nativos gerados por `npm run mobile:assets`

Sincronizar app web com as plataformas nativas:

```bash
docker compose run --rm gas_app npm run cap:sync
```

Atualizar apenas Android:

```bash
docker compose run --rm gas_app npm run cap:android
```

Atualizar apenas iOS:

```bash
docker compose run --rm gas_app npm run cap:ios
```

## Abrir nas IDEs nativas

Com Node instalado localmente e as dependencias instaladas, use:

```bash
npm run cap:open:android
npm run cap:open:ios
```

Android precisa de Android Studio/Android SDK. iOS precisa de macOS com Xcode.

## Dados locais

Hoje os dados ficam no `localStorage`, na chave:

```text
gas-control-state-v1
```

Para limpar tudo no navegador:

```js
localStorage.removeItem('gas-control-state-v1')
location.reload()
```


## Login e usuarios locais

Esta fase adiciona uma camada de login local usando `localStorage`. Nao e autenticacao segura para producao; e uma simulacao funcional para validar o fluxo mobile antes de criar backend/API.

Acessos iniciais:

```text
Usuario: casa@gas.local / casa123
Super admin: admin@gas.local / admin123
```

Chaves usadas no navegador:

```text
gas-control-users-v1
gas-control-session-v1
```

O usuario comum ve somente o acompanhamento da propria casa. O super admin acessa o dashboard geral com nivel estimado, status, previsao, media e historico consolidado de todas as casas cadastradas.

Para zerar tambem usuarios e sessao:

```js
localStorage.removeItem('gas-control-users-v1')
localStorage.removeItem('gas-control-session-v1')
location.reload()
```
