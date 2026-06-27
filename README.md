# Controle Gas

Aplicativo React/Vite para acompanhar o consumo de um botijao P13, com API Node/Express e persistencia em MySQL.

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
docker compose run --rm gas_app npm test
```

## Banco de dados

Em desenvolvimento com Docker, a API usa as variaveis configuradas no `docker-compose.yml`:

```text
DB_CONNECTION=mysql
DB_HOST=infra-mysql-1
DB_PORT=3306
DB_DATABASE=controlegasabs
DB_USERNAME=admin
DB_PASSWORD=admin
```

A API cria automaticamente a tabela `gas_users` quando sobe.

## Producao sem Docker

Crie um arquivo `.env` no servidor a partir de `.env.production.example`:

```text
API_PORT=3001
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=rico4167_controlegasabs
DB_USERNAME=rico4167_controlegasabs
DB_PASSWORD=troque-pela-senha-real
VITE_API_URL=
CLIENT_ORIGIN=
```

Instale, gere o build e inicie:

```bash
npm install
npm run build
npm start
```

Com `VITE_API_URL` vazio, o mesmo servidor Node entrega o frontend de `dist/` e a API em `/api`.

Se o frontend ficar em outro dominio ou o app mobile chamar a API publica, defina antes do build:

```text
VITE_API_URL=https://seudominio.com
CLIENT_ORIGIN=https://seudominio.com
```

Para Capacitor/mobile, rode o build com `VITE_API_URL` apontando para a URL publica da API antes de sincronizar:

```bash
npm run cap:android
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

## Dados e sessao

Os dados principais ficam no MySQL, via API Node. O navegador ainda guarda sessao e uma copia local de emergencia nas chaves:

```text
gas-control-users-v1
gas-control-session-v1
```

Para limpar a sessao/copia local do navegador sem apagar o banco:

```js
localStorage.removeItem('gas-control-users-v1')
localStorage.removeItem('gas-control-session-v1')
location.reload()
```


## Login e usuarios

A API semeia os acessos iniciais quando o banco esta vazio:

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
