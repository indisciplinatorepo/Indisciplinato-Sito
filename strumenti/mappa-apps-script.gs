/**
 * Pagina Michelerio (https://www.indisciplinato.it/liceo-artistico/)
 * Un solo Apps Script per:
 *   - salvare online la disposizione dei blocchi della mappa (con password);
 *   - raccogliere e mostrare le idee del modulo "Suggerisci un'idea" (con captcha).
 *
 * COME ATTIVARLO (5 minuti):
 * 1. Crea un nuovo Foglio Google, ad esempio "Michelerio – mappa e idee".
 * 2. Estensioni > Apps Script, incolla tutto questo file e salva.
 * 3. Impostazioni progetto (rotella) > Proprietà script > Aggiungi:
 *      MAPPA_PASSWORD = la password per pubblicare le modifiche alla mappa
 * 4. Distribuisci > Nuova distribuzione > tipo "App web"
 *      Esegui come: Me · Chi ha accesso: Chiunque
 *    Autorizza e copia l'URL che finisce con /exec.
 * 5. In public/liceo-artistico/index.html metti quell'URL in:  const SHEET_API = "...";
 *
 * Fogli creati in automatico:
 *  - "mappa": una riga per ogni salvataggio (l'ultima è quella mostrata; lo storico resta).
 *  - "idee":  data, nome, idea, visibile. Per nascondere un'idea scrivi FALSO nella colonna "visibile".
 *
 * Captcha: domanda aritmetica generata qui, firmata con una chiave segreta (creata da sola
 * al primo uso) e valida una sola volta per 30 minuti. In più: campo trappola invisibile
 * e tempo minimo di compilazione. Sono controlli lato server, non aggirabili dalla pagina.
 */

const F_MAPPA = "mappa";
const F_IDEE = "idee";
const MAX_IDEE_MOSTRATE = 200;

/* ---------------- utilità ---------------- */
function foglio_(nome, intestazione) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.appendRow(intestazione);
    sh.setFrozenRows(1);
  }
  return sh;
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function segreto_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty("CAPTCHA_SEGRETO");
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty("CAPTCHA_SEGRETO", s); }
  return s;
}
function firma_(testo) {
  const b = Utilities.computeHmacSha256Signature(testo, segreto_());
  return Utilities.base64EncodeWebSafe(b).replace(/=+$/, "");
}
function pulisci_(s, max) {
  return String(s || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
// evita che un testo venga interpretato come formula nel foglio
function sicuroPerFoglio_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }

/* ---------------- GET ---------------- */
function doGet(e) {
  const azione = (e && e.parameter && e.parameter.azione) || "mappa";

  if (azione === "captcha") {
    const a = 2 + Math.floor(Math.random() * 9), b = 1 + Math.floor(Math.random() * 9);
    const somma = Math.random() < 0.5;
    const risultato = somma ? a + b : Math.max(a, b) - Math.min(a, b);
    const domanda = somma ? a + " + " + b : Math.max(a, b) + " − " + Math.min(a, b);
    const ts = Date.now();
    return json_({ ok: true, domanda: domanda, token: ts + "." + firma_(risultato + "|" + ts) });
  }

  if (azione === "idee") {
    const sh = foglio_(F_IDEE, ["data", "nome", "idea", "visibile"]);
    const n = sh.getLastRow();
    if (n < 2) return json_({ ok: true, idee: [] });
    const righe = sh.getRange(2, 1, n - 1, 4).getValues()
      .filter(r => r[2] && r[3] !== false && String(r[3]).toUpperCase() !== "FALSO" && String(r[3]).toUpperCase() !== "FALSE")
      .map(r => ({ data: r[0] instanceof Date ? r[0].toISOString() : r[0], nome: String(r[1] || ""), idea: String(r[2]) }))
      .reverse()
      .slice(0, MAX_IDEE_MOSTRATE);
    return json_({ ok: true, idee: righe });
  }

  // mappa: ultima disposizione salvata
  const sh = foglio_(F_MAPPA, ["salvato", "blocchi (JSON)"]);
  const n = sh.getLastRow();
  if (n < 2) return json_({ ok: true, blocchi: null });
  const [salvato, testo] = sh.getRange(n, 1, 1, 2).getValues()[0];
  return json_({ ok: true, salvato: new Date(salvato).toISOString(), blocchi: JSON.parse(testo) });
}

/* ---------------- POST ---------------- */
function doPost(e) {
  let dati;
  try { dati = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, errore: "Richiesta non valida." }); }
  if (dati.azione === "salvaMappa") return salvaMappa_(dati);
  if (dati.azione === "idea") return salvaIdea_(dati);
  return json_({ ok: false, errore: "Azione sconosciuta." });
}

function salvaMappa_(dati) {
  const pw = PropertiesService.getScriptProperties().getProperty("MAPPA_PASSWORD");
  if (!pw || dati.password !== pw) return json_({ ok: false, errore: "Password errata." });
  const b = dati.blocchi;
  const valido = Array.isArray(b) && b.length > 0 && b.length < 300 && b.every(x =>
    x && typeof x.nome === "string" && x.nome.length <= 60 && /^#[0-9a-f]{6}$/i.test(x.c) &&
    ["x", "y", "w", "d", "h"].every(k => typeof x[k] === "number" && isFinite(x[k])));
  if (!valido) return json_({ ok: false, errore: "Dati della mappa non validi." });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { foglio_(F_MAPPA, ["salvato", "blocchi (JSON)"]).appendRow([new Date(), JSON.stringify(b)]); }
  finally { lock.releaseLock(); }
  return json_({ ok: true });
}

function salvaIdea_(dati) {
  // 1. trappola e tempo minimo
  if (dati.sito) return json_({ ok: false, errore: "Idea non inviata." });
  if (!(Number(dati.tempo) > 3000)) return json_({ ok: false, errore: "Troppo veloce: riprova tra qualche secondo." });

  // 2. captcha firmato, valido 30 minuti e una sola volta
  const parti = String(dati.token || "").split(".");
  const ts = Number(parti[0]);
  if (parti.length !== 2 || !ts || Date.now() - ts > 30 * 60 * 1000) return json_({ ok: false, errore: "Domanda di verifica scaduta: rispondi a quella nuova." });
  const risposta = String(dati.risposta || "").replace(/\s/g, "");
  if (!/^\d{1,3}$/.test(risposta) || firma_(Number(risposta) + "|" + ts) !== parti[1]) return json_({ ok: false, errore: "Risposta di verifica sbagliata: riprova con la nuova domanda." });
  const cache = CacheService.getScriptCache();
  if (cache.get("usato:" + parti[1])) return json_({ ok: false, errore: "Domanda di verifica già usata: rispondi a quella nuova." });
  cache.put("usato:" + parti[1], "1", 21600);

  // 3. contenuto
  const idea = pulisci_(dati.idea, 800), nome = pulisci_(dati.nome, 60);
  if (idea.length < 5) return json_({ ok: false, errore: "L'idea è troppo corta." });
  if ((idea.match(/https?:\/\//g) || []).length > 2) return json_({ ok: false, errore: "Troppi link nel testo." });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { foglio_(F_IDEE, ["data", "nome", "idea", "visibile"]).appendRow([new Date(), sicuroPerFoglio_(nome), sicuroPerFoglio_(idea), true]); }
  finally { lock.releaseLock(); }
  return json_({ ok: true });
}
