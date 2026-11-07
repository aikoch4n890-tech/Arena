// Servidor do DM-Phobos Live: entrega o jogo e faz a ponte do chat (YouTube/TikTok) por WebSocket em /chat
const http = require("http");
const path = require("path");
const fs = require("fs");
const { WebSocketServer } = require("ws");
const { connectLink } = require("./chat");

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".json": "application/json" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  if (url === "/health") { res.writeHead(200); return res.end("ok"); }
  const file = path.join(PUB, url === "/" ? "index.html" : url);
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("não encontrado"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: "/chat" });
wss.on("connection", ws => {
  let stop = null, alive = true;
  const send = o => { if (ws.readyState === 1) { try { ws.send(JSON.stringify(o)); } catch (e) {} } };
  ws.on("pong", () => { alive = true; });
  const ping = setInterval(() => { if (!alive) return ws.terminate(); alive = false; try { ws.ping(); } catch (e) {} }, 25000);
  ws.on("message", async raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.type !== "connect") return;
    if (stop) { stop(); stop = null; }
    send({ type: "status", text: "conectando à live…" });
    try { stop = await connectLink(m.link, send); }
    catch (e) { send({ type: "status", text: "erro: " + e.message }); }
  });
  ws.on("close", () => { clearInterval(ping); if (stop) stop(); });
});

server.listen(PORT, () => console.log("DM-Phobos Live em http://localhost:" + PORT));
