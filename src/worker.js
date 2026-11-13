/**
 * Worker del sito Indisciplinato.
 * Le pagine statiche in public/ sono servite direttamente da Cloudflare (Workers Static Assets);
 * questo script risponde a /api/* e controlla la password dell'area riservata (vedi "run_worker_first" in wrangler.jsonc).
 *
 * /api/captcha            GET  -> { domanda, token }            domanda di verifica firmata
 * /api/idee               GET  -> { idee: [...] }               idee visibili, dalla più recente
 * /api/idee               POST -> { ok } | { ok:false, errore } nuova idea (captcha + controlli)
 * /api/idee/nascondi      POST { id, chiave }                   moderazione (serve il secret ADMIN_KEY)
 * /api/idee/mostra        POST { id, chiave }
 *
 * I dati stanno in un Durable Object con database SQLite: niente da configurare a mano.
 *
 * Area riservata: /area-e8b40baf0f/ (pagina di accesso), /bandi-1868203d96/ e /todo-7c41e9a2b5/
 * chiedono nome utente e password (HTTP Basic). Qui c'è solo l'impronta SHA-256 di
 * "utente:password", non la password. Le credenziali sono su Notion (Password clienti › Indisciplinato).
 * Per cambiarle senza toccare il codice: in Cloudflare aggiungi il secret AREA_HASH con l'impronta nuova.
 */

const AREA_RISERVATA = ["/area-e8b40baf0f", "/bandi-1868203d96", "/todo-7c41e9a2b5"];
const AREA_HASH = "b66f7b403211b1e791e1a50dd6151a30e8132d8a35ba41437860327b8668b8fe";

async function sha256hex(testo) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(testo));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function confronta(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function autorizzato(request, env) {
  const h = request.headers.get("authorization") || "";
  if (!h.startsWith("Basic ")) return false;
  let credenziali;
  try { credenziali = atob(h.slice(6)); } catch { return false; }
  return confronta(await sha256hex(credenziali), env.AREA_HASH || AREA_HASH);
}

const chiedi = () => new Response("Area riservata Indisciplinato: servono nome utente e password.", {
  status: 401,
  headers: {
    "www-authenticate": 'Basic realm="Indisciplinato - area riservata", charset="UTF-8"',
    "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow",
  },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (AREA_RISERVATA.some(p => url.pathname === p || url.pathname.startsWith(p + "/"))) {
      if (!(await autorizzato(request, env))) return chiedi();
      const risposta = await env.ASSETS.fetch(request);
      const r = new Response(risposta.body, risposta);
      r.headers.set("cache-control", "private, no-store");
      r.headers.set("x-robots-tag", "noindex, nofollow");
      r.headers.set("referrer-policy", "no-referrer");
      return r;
    }
    if (url.pathname.startsWith("/api/")) {
      const stub = env.IDEE.get(env.IDEE.idFromName("michelerio"));
      return stub.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

const IDEE_INIZIALI = [ // idee emerse all'incontro con il Liceo Artistico (10 novembre 2026)
  { data: "2026-11-10T15:00:00.000Z", nome: "Incontro con il Liceo Artistico", idea: "Inserire nella mappa anche un percorso." },
  { data: "2026-11-10T15:01:00.000Z", nome: "Incontro con il Liceo Artistico", idea: "Aggiungere un racconto audio non descrittivo." },
];

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
});
const errore = (msg, status = 200) => json({ ok: false, errore: msg }, status);
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const pulisci = (s, max) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);

export class Idee {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;
    this.chiave = null;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS idee (
      id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, nome TEXT NOT NULL DEFAULT '',
      idea TEXT NOT NULL, visibile INTEGER NOT NULL DEFAULT 1, ip TEXT NOT NULL DEFAULT '')`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS usati (firma TEXT PRIMARY KEY, ts INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS conf (k TEXT PRIMARY KEY, v TEXT NOT NULL)`);
    if (!this.conf("semi-1")) {
      for (const i of IDEE_INIZIALI) this.sql.exec("INSERT INTO idee (data, nome, idea) VALUES (?, ?, ?)", i.data, i.nome, i.idea);
      this.setConf("semi-1", "1");
    }
  }

  conf(k) { const r = this.sql.exec("SELECT v FROM conf WHERE k = ?", k).toArray(); return r.length ? r[0].v : null; }
  setConf(k, v) { this.sql.exec("INSERT OR REPLACE INTO conf (k, v) VALUES (?, ?)", k, v); }

  async hmac(testo) {
    if (!this.chiave) {
      let s = this.conf("segreto");
      if (!s) {
        s = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
        this.setConf("segreto", s);
      }
      this.chiave = await crypto.subtle.importKey("raw", new TextEncoder().encode(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    }
    return b64url(await crypto.subtle.sign("HMAC", this.chiave, new TextEncoder().encode(testo)));
  }

  async fetch(request) {
    const url = new URL(request.url);
    const p = url.pathname.replace(/\/+$/, "");
    try {
      if (request.method === "GET" && p === "/api/captcha") return this.captcha();
      if (request.method === "GET" && p === "/api/idee") return this.elenco();
      if (request.method === "POST") {
        const testo = await request.text();
        if (testo.length > 10000) return errore("Richiesta troppo grande.", 413);
        let dati;
        try { dati = JSON.parse(testo); } catch { return errore("Richiesta non valida.", 400); }
        if (p === "/api/idee") return this.nuova(dati, request);
        if (p === "/api/idee/nascondi") return this.visibilita(dati, 0);
        if (p === "/api/idee/mostra") return this.visibilita(dati, 1);
      }
      return errore("Non trovato.", 404);
    } catch (e) {
      return errore("Errore interno, riprova.", 500);
    }
  }

  async captcha() {
    const a = 2 + Math.floor(Math.random() * 9), b = 1 + Math.floor(Math.random() * 9);
    const somma = a === b || Math.random() < 0.5;
    const ris = somma ? a + b : Math.max(a, b) - Math.min(a, b);
    const domanda = somma ? `${a} + ${b}` : `${Math.max(a, b)} − ${Math.min(a, b)}`;
    const ts = Date.now();
    return json({ ok: true, domanda, token: `${ts}.${await this.hmac(`${ris}|${ts}`)}` });
  }

  elenco() {
    const idee = this.sql.exec("SELECT id, data, nome, idea FROM idee WHERE visibile = 1 ORDER BY id DESC LIMIT 300").toArray();
    return json({ ok: true, idee });
  }

  async nuova(d, request) {
    if (d.sito) return errore("Idea non inviata.");
    if (!(Number(d.tempo) > 3000)) return errore("Troppo veloce: aspetta qualche secondo e riprova.");

    const [tsTxt, firma] = String(d.token || "").split(".");
    const ts = Number(tsTxt);
    if (!ts || !firma || Date.now() - ts > 30 * 60 * 1000 || ts > Date.now() + 60000) return errore("Domanda di verifica scaduta: rispondi a quella nuova.");
    const risposta = String(d.risposta ?? "").replace(/\s/g, "");
    if (!/^\d{1,3}$/.test(risposta) || (await this.hmac(`${Number(risposta)}|${ts}`)) !== firma) return errore("Risposta di verifica sbagliata: riprova con la nuova domanda.");
    this.sql.exec("DELETE FROM usati WHERE ts < ?", Date.now() - 2 * 3600 * 1000);
    if (this.sql.exec("SELECT 1 FROM usati WHERE firma = ?", firma).toArray().length) return errore("Domanda di verifica già usata: rispondi a quella nuova.");
    this.sql.exec("INSERT INTO usati (firma, ts) VALUES (?, ?)", firma, Date.now());

    const idea = pulisci(d.idea, 800), nome = pulisci(d.nome, 60);
    if (idea.length < 5) return errore("L'idea è troppo corta.");
    if ((idea.match(/https?:\/\//gi) || []).length > 2) return errore("Troppi link nel testo.");

    // limite gentile per indirizzo (una classe intera può scrivere dalla stessa rete)
    const ip = await this.hmac("ip|" + (request.headers.get("CF-Connecting-IP") || ""));
    const dieciMin = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recenti = this.sql.exec("SELECT COUNT(*) AS n FROM idee WHERE ip = ? AND data > ?", ip, dieciMin).toArray()[0].n;
    if (recenti >= 30) return errore("Troppe idee in poco tempo da questa rete: riprova tra qualche minuto.");

    this.sql.exec("INSERT INTO idee (data, nome, idea, ip) VALUES (?, ?, ?, ?)", new Date().toISOString(), nome, idea, ip);
    return json({ ok: true });
  }

  visibilita(d, v) {
    const k = this.env.ADMIN_KEY;
    if (!k || d.chiave !== k) return errore("Non autorizzato.", 403);
    this.sql.exec("UPDATE idee SET visibile = ? WHERE id = ?", v, Number(d.id));
    return json({ ok: true });
  }
}
