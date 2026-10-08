# AFFiNE no myserver

Aplicação: https://my.ovvesley.com — administrador: me@ovvesley.com.

Base: release v0.27.4, commit b4c8548c09da21b2898443559a5b846f0ccf5dd8.
O código completo está neste fork; os ajustes operacionais estão nesta pasta.
A aplicação usa a imagem oficial da mesma release, fixada por digest. Ainda não
há alterações no código do aplicativo nem um build próprio. Para alterar o
aplicativo, siga docs/BUILDING.md e .github/workflows/build-images.yml e substitua
AFFINE_IMAGE pela imagem resultante. Preserve as licenças do upstream.

## Estrutura

/opt/projects/affine contém compose.yml, .env privado, config/config.json,
data/postgres, data/storage, backups e releases. Banco e Redis não publicam portas.
Só a aplicação usa a rede externa traefik, com TLS via letsencrypt.
config.json é o modelo inicial; deploys preservam a configuração existente.
IA está desativada; SMTP não foi configurado. Login funciona por senha.

## Deploy

Depois de commit na main: ./deploy/myserver/deploy.sh myserver.
O servidor precisa ter Docker Compose, rede traefik, .env e backup.sh inicializados.
O deploy faz backup, baixa as imagens, executa migrações e espera saúde dos serviços.
Segredos e credenciais nunca devem ser adicionados ao Git.

## Backup e restauração

backup.sh pausa a aplicação, salva pg_dump em formato custom e um tar de storage,
configuração, .env e Compose; retém 14 snapshots. Timer diário às 03h de Brasília.
Os backups estão no mesmo servidor; uma cópia externa ainda precisa ser configurada.

Para restaurar em produção, interrompa a aplicação, preserve um backup do estado
atual, restaure files.tar.gz em /opt/projects/affine e restaure database.dump no
banco vazio com pg_restore -U affine -d affine. Suba a imagem correspondente ao
snapshot, execute as migrações dessa versão e valide /info e login. Nunca apenas
rebaixe a imagem após migrações: restaure banco e arquivos do mesmo snapshot.

A validação inicial incluiu restauração do dump em banco temporário separado,
HTTPS, login no navegador e persistência da conta após reinício.

## Login obrigatório

O gateway Node valida cada requisição e conexão WebSocket por currentUser no
backend. Visitantes recebem /login; editor, APIs e arquivos exigem sessão válida.
A raiz e links de workspaces locais abrem o workspace privado sincronizado após
login. O backend não está mais na rede Traefik. O gateway encaminha os cookies
originais do AFFiNE, sem guardar senhas ou criar autenticação paralela.
O código do gateway está em gateway/server.mjs, com runtime fixado por digest.
Backups incluem o gateway. A tela não oferece cadastro nem workspace demo.

## Importação Obsidian

O fork permite 128 MiB e 1000 notas por importação web (8 MiB por arquivo).
Dockerfile deriva da release fixada e aplica a mesma mudança no bundle compilado,
com verificação exata para falhar se o upstream mudar. O código fonte correspondente
está em packages/frontend/core/src/desktop/dialogs/import/web-limits.ts.
Build: docker build -t ovvesley-affine:obsidian deploy/myserver.
Configure AFFINE_IMAGE com essa imagem antes do deploy.
