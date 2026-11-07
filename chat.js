// Conecta ao chat de uma live a partir do link (YouTube ou TikTok) e repassa as mensagens.
// Twitch não passa por aqui: o próprio jogo conecta direto no navegador.
function parseLink(raw) {
  const s = String(raw || "").trim();
  if (!s) throw new Error("link vazio");
  if (/^@?[A-Za-z0-9_.-]+$/.test(s) && s.startsWith("@")) return { plat: "youtube", id: { handle: s } };
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : "https://" + s); } catch (e) { throw new Error("link inválido"); }
  const h = u.hostname.replace(/^www\.|^m\./, "");
  if (h === "youtu.be") return { plat: "youtube", id: { liveId: u.pathname.slice(1).split("/")[0] } };
  if (h.endsWith("youtube.com")) {
    const v = u.searchParams.get("v");
    if (v) return { plat: "youtube", id: { liveId: v } };
    const p = u.pathname.split("/").filter(Boolean);
    if (p[0] === "live" && p[1]) return { plat: "youtube", id: { liveId: p[1] } };
    if (p[0] && p[0].startsWith("@")) return { plat: "youtube", id: { handle: p[0] } };
    if (p[0] === "channel" && p[1]) return { plat: "youtube", id: { channelId: p[1] } };
    throw new Error("não achei o vídeo/canal no link do YouTube");
  }
  if (h.endsWith("tiktok.com")) {
    const m = /\/@([^/?#]+)/.exec(u.pathname);
    if (m) return { plat: "tiktok", id: m[1] };
    throw new Error("use o link do perfil do TikTok (tiktok.com/@usuario/live)");
  }
  if (h.endsWith("twitch.tv")) return { plat: "twitch", id: u.pathname.split("/").filter(Boolean)[0] };
  throw new Error("plataforma não reconhecida (YouTube, TikTok ou Twitch)");
}

// send({type:"status",text}) para avisos; send({id,user,message,plat}) para mensagens
// links curtos (vm.tiktok.com, tiktok.com/t/..., youtube.com/shorts) são abertos para descobrir o endereço real
async function resolveShort(raw) {
  const s = String(raw || "").trim();
  if (!/(vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t\/)/i.test(s)) return s;
  const url = /^https?:\/\//i.test(s) ? s : "https://" + s;
  try {
    const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36" } });
    if (/\/@[^/?#]+/.test(r.url)) return r.url;
    const t = await r.text();
    const m = /tiktok\.com\/@([A-Za-z0-9_.]+)/.exec(t) || /"uniqueId":"([A-Za-z0-9_.]+)"/.exec(t);
    if (m) return "https://www.tiktok.com/@" + m[1];
  } catch (e) {}
  throw new Error("não consegui abrir o link curto do TikTok; use tiktok.com/@usuario/live");
}

async function connectLink(raw, send, libs = {}) {
  const L = parseLink(await resolveShort(raw));
  if (L.plat === "twitch") { send({ type: "status", text: "Twitch conecta direto no navegador" }); return () => {}; }
  if (L.plat === "youtube") {
    const { LiveChat } = libs.youtube || require("youtube-chat");
    const lc = new LiveChat(L.id);
    lc.on("chat", c => {
      const msg = (c.message || []).map(x => x.text || x.emojiText || "").join("");
      send({ id: "yt:" + (c.author && c.author.channelId), user: c.author && c.author.name, message: msg, plat: "youtube" });
    });
    lc.on("start", () => send({ type: "status", text: "YouTube conectado" }));
    lc.on("end", r => send({ type: "status", text: "YouTube: live encerrada" + (r ? " (" + r + ")" : "") }));
    lc.on("error", e => send({ type: "status", text: "YouTube: " + (e && e.message ? e.message : String(e)) }));
    const ok = await lc.start();
    if (!ok) throw new Error("não consegui abrir o chat do YouTube (a live está no ar?)");
    return () => { try { lc.stop(); } catch (e) {} };
  }
  if (L.plat === "tiktok") {
    const T = libs.tiktok || require("tiktok-live-connector");
    const Conn = T.TikTokLiveConnection || T.WebcastPushConnection;
    const ev = (T.WebcastEvent && T.WebcastEvent.CHAT) || "chat";
    const key = process.env.EULER_API_KEY || process.env.SIGN_API_KEY || process.env.EULER_KEY || process.env.TIKTOK_SIGN_API_KEY;
    if (key && T.SignConfig) T.SignConfig.apiKey = key;
    const c = new Conn(L.id, key ? { signApiKey: key } : {});
    // diagnóstico: conta tudo que chega para saber se o TikTok está mandando eventos
    let nEv = 0, nChat = 0, lastLog = 0;
    const seen = new Map();
    const emitChat = (d, via) => {
      const u = (d && d.user) || d || {};
      const text = d && (d.comment || d.content);
      if (!text) return;
      const uid = String(u.userId || d.userId || u.uniqueId || d.uniqueId || u.nickname || "?");
      const key = uid + "|" + text, t = Date.now();
      if (seen.has(key) && t - seen.get(key) < 3000) return;
      seen.set(key, t); if (seen.size > 500) seen.clear();
      nChat++;
      console.log("[tiktok chat via " + via + "]", uid, text);
      send({ id: "tt:" + uid, user: u.nickname || d.nickname || u.uniqueId || d.uniqueId || uid, message: text, plat: "tiktok" });
    };
    c.on(ev, d => emitChat(d, "chat"));
    if (ev !== "chat") c.on("chat", d => emitChat(d, "chat-legacy"));
    const DEC = (T.ControlEvent && T.ControlEvent.DECODED_DATA) || "decodedData";
    c.on(DEC, (type, data) => {
      nEv++;
      if (/Chat/i.test(String(type))) emitChat(data, "raw");
      const t = Date.now();
      if (t - lastLog > 15000) { lastLog = t; send({ type: "status", text: "TikTok @" + L.id + " · " + nEv + " eventos · " + nChat + " comentários" }); }
    });
    c.on((T.ControlEvent && T.ControlEvent.DISCONNECTED) || "disconnected", () => send({ type: "status", text: "TikTok desconectado" }));
    c.on((T.WebcastEvent && T.WebcastEvent.STREAM_END) || "streamEnd", () => send({ type: "status", text: "TikTok: live encerrada" }));
    c.on((T.ControlEvent && T.ControlEvent.ERROR) || "error", e => send({ type: "status", text: "TikTok: " + (e && e.message ? e.message : String(e)) }));
    await c.connect();
    send({ type: "status", text: "TikTok conectado (@" + L.id + ")" + (key ? "" : " sem chave Euler") });
    return () => { try { c.disconnect(); } catch (e) {} };
  }
}
module.exports = { parseLink, connectLink };
