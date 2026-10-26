# Fase 7 — Infraestrutura PWA

## Resultado

O aplicativo agora possui infraestrutura para instalação, abertura offline, atualização controlada e retomada de sincronização.

## Manifesto

O manifesto inclui:

- `id`, nome completo, nome curto e descrição;
- idioma `pt-BR`, escopo e orientação principal;
- categorias e cores de instalação;
- ícones `any` e `maskable`;
- screenshots estreita e larga;
- atalhos para trocar botijão, usar reserva, cadastrar reserva e abrir alertas.

Os atalhos operacionais abrem a tela correspondente e iniciam a jornada solicitada quando existe uma sessão de usuário.

## Estratégia de cache

| Recurso | Estratégia |
| --- | --- |
| Interface e assets | Cache versionado, com preenchimento durante instalação e uso |
| Manifesto, ícones e screenshots | Cacheados |
| Tela offline | Cacheada na instalação |
| Navegação | Rede primeiro, shell ou tela offline como fallback |
| API e autenticação | Somente rede, resposta 503 offline e nunca Cache API |
| Dados pessoais | Nunca gravados no Cache API |
| Cópia operacional | `localStorage` controlado pelo aplicativo |
| Fila pendente | Metadados no armazenamento local, sem duplicar dados pessoais |

Caches antigos com o prefixo do aplicativo são removidos na ativação de uma nova versão.

## Atualização

Quando um novo service worker termina a instalação:

1. aparece o aviso **Atualização disponível**;
2. o usuário escolhe **Atualizar agora**;
3. o worker em espera recebe `SKIP_WAITING`;
4. a página recarrega depois da troca do controlador.

O servidor entrega `service-worker.js` com `no-cache`, evitando que uma versão antiga impeça a detecção da nova.

## Sincronização pendente

Quando a gravação remota falha:

- a cópia operacional continua no armazenamento local;
- somente metadados da pendência são adicionados à fila;
- o aplicativo tenta registrar Background Sync quando suportado;
- o evento `online` também dispara nova tentativa;
- a fila é limpa depois de uma sincronização bem-sucedida.

## Teste manual

### Instalação

1. Abra o aplicativo por HTTPS ou localhost.
2. Confira nome, ícone e descrição na interface de instalação.
3. Verifique as screenshots estreita e larga.
4. Instale e confirme abertura em modo standalone.
5. No iOS, use **Compartilhar → Adicionar à Tela de Início**.

### Atalhos

1. Com o aplicativo instalado, abra o menu de contexto do ícone.
2. Teste **Trocar botijão**, **Usar reserva**, **Cadastrar reserva** e **Ver alertas**.
3. Confirme que cada atalho abre a tela e a jornada corretas.

### Uso offline

1. Abra o aplicativo conectado pelo menos uma vez.
2. Ative o modo offline do dispositivo.
3. Reabra a PWA e confirme o carregamento do shell.
4. Acesse uma navegação não armazenada e confira `offline.html`.
5. Confirme que chamadas `/api` não retornam dados cacheados.

### Fila de sincronização

1. Sem conexão, altere um dado operacional.
2. Confirme a mensagem de sincronização pendente.
3. Restaure a conexão.
4. Confirme a sincronização automática e a limpeza da pendência.

### Atualização

1. Com uma PWA instalada, publique uma versão com novo `CACHE_VERSION`.
2. Reabra o aplicativo e aguarde o aviso.
3. Toque em **Atualizar agora**.
4. Confirme o recarregamento e a remoção do cache anterior.

## Validação técnica

Nesta fase foi feita apenas revisão estática. A validação instalada em navegador, Android, iOS e o build de produção permanecem para a Fase 10.
