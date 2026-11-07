# DM-Phobos Live

Arena automática no estilo Unreal Tournament feita para lives. Os espectadores entram pelo chat com `!entrar` e votam a arma com `!arma 1-5`.

## Subir no GitHub
1. Crie um repositório novo no GitHub (pode ser privado).
2. Clique em **Add file → Upload files** e arraste o **conteúdo** desta pasta: `public/`, `server.js`, `chat.js`, `package.json`, `render.yaml`, `.gitignore` e `README.md`.
3. Clique em **Commit**.

## Publicar no Render
1. Acesse render.com, faça login com o GitHub e clique em **New → Blueprint**.
2. Escolha o repositório. O Render lê o `render.yaml` sozinho.
   - Também funciona por **New → Web Service**, com Build `npm install` e Start `node server.js`.
3. Espere o deploy terminar e abra o endereço `https://SEU-APP.onrender.com`.

## Conectar a live
1. No menu do jogo, abra a seção **Live** e escolha a plataforma **Link da live**.
2. Cole o link da live:
   - YouTube: `youtube.com/watch?v=...`, `youtube.com/live/...`, `youtu.be/...` ou `youtube.com/@canal`
   - TikTok: `tiktok.com/@usuario/live`
   - Twitch: `twitch.tv/canal` (a conexão é feita direto no navegador)
3. No OBS, adicione uma **Fonte de navegador** com o endereço do Render, em 1920×1080.

### Atalhos
- **P**: muda o painel (top 5, top 12 ou oculto)
- **F**: tela cheia
- **H**: esconde ou mostra a barra do host (espectadores falsos, avançar fase)

## Avisos
- No plano grátis, o Render "dorme" depois de 15 minutos sem acesso. Abra o link alguns minutos antes da live.
- O TikTok às vezes bloqueia servidores de datacenter ou exige uma chave de assinatura. Se não conectar, o status aparece no jogo.
- O chat do YouTube só funciona com a live **no ar**.
- As estatísticas ficam salvas no navegador que roda o jogo (o do OBS). Use sempre o mesmo.
