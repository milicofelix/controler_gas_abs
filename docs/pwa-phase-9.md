# Fase 9 — Instalação e atualização

## Resultado

A instalação e a atualização do Meu Gás agora possuem uma jornada compreensível para usuários não técnicos.

- O evento `beforeinstallprompt` é capturado e apresentado como ação **Instalar aplicativo** quando o navegador oferece instalação automática.
- O evento `appinstalled` confirma a conclusão da instalação.
- A execução em modo `standalone` é identificada no cabeçalho e nas configurações.
- Quando não existe prompt automático, o guia apresenta instruções separadas para Safari/iOS, Chrome/Android e computador.
- Uma nova versão aparece em um aviso discreto com a ação **Atualizar agora**.
- Se uma operação ou formulário de perfil estiver aberto ou alterado, a atualização é bloqueada até o usuário salvar ou cancelar.
- Ao encerrar a sessão, os caches de interface mantidos pelo service worker e a fila de sincronização da sessão são removidos. Os dados pessoais nunca são armazenados no Cache API.

## Teste manual — instalação

1. Abra o sistema no Chrome ou Edge usando HTTPS ou `localhost`.
2. Entre como usuário e abra **Perfil → Aplicativo**.
3. Confirme que o estado mostra **Aberto no navegador**.
4. Quando o navegador disponibilizar a instalação, clique em **Instalar aplicativo**.
5. Aceite e confirme que aparece a mensagem **Aplicativo instalado com sucesso**.
6. Feche a aba e abra pelo ícone instalado.
7. Confirme que o cabeçalho mostra **Modo aplicativo** e as configurações mostram **PWA instalada**.

## Teste manual — Safari no iPhone ou iPad

1. Abra o sistema no Safari.
2. Entre como usuário e abra **Perfil → Aplicativo**.
3. Toque em **Guia de instalação**.
4. Confira as instruções: Compartilhar → Adicionar à Tela de Início → Adicionar.
5. Realize esses passos, feche o Safari e abra o ícone criado.
6. Confirme que o aplicativo abre sem a interface normal do navegador e indica **Modo aplicativo**.

## Teste manual — atualização protegida

1. Com uma nova versão aguardando no service worker, confirme que aparece o aviso **Atualização disponível**.
2. Sem formulário aberto, toque em **Atualizar agora** e confirme que o aplicativo recarrega uma única vez.
3. Em outra atualização, abra **Botijões**, inicie uma troca e preencha algum campo.
4. Toque em **Atualizar agora**.
5. Confirme que a atualização não acontece e que os dados preenchidos continuam visíveis.
6. Cancele ou conclua a operação e toque novamente em **Atualizar agora**.
7. Repita alterando um campo em **Perfil**, sem salvar, e confirme o mesmo bloqueio.

## Teste manual — limpeza no logout

1. Com a PWA aberta, use as ferramentas do navegador em **Application → Cache Storage** e confirme a presença do cache `meu-gas-shell-*`.
2. Clique em **Encerrar sessão**.
3. Confirme que a sessão é encerrada e que os caches `meu-gas-shell-*` existentes naquele momento são removidos.
4. Entre novamente e confirme que o service worker pode recriar o cache de interface normalmente.

## Validação da fase

Build, lint, testes automatizados e a matriz completa em navegadores, Android, iOS e Capacitor permanecem reservados para a Fase 10, conforme definido no projeto.
