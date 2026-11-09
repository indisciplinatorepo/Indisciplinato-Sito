/**
 * Mappa sensoriale del Michelerio – salvataggio online della disposizione dei blocchi.
 * Pagina: https://www.indisciplinato.it/liceo-artistico/
 *
 * COME ATTIVARLO (5 minuti):
 * 1. Crea un nuovo Foglio Google, ad esempio "Mappa Michelerio – salvataggi".
 * 2. Estensioni > Apps Script, incolla tutto questo file e salva.
 * 3. Impostazioni progetto (rotella) > Proprietà script > Aggiungi:
 *      MAPPA_PASSWORD = la password che darete a chi può modificare
 * 4. Esegui > Distribuisci > Nuova distribuzione > tipo "App web"
 *      Esegui come: Me · Chi ha accesso: Chiunque
 *    Copia l'URL che finisce con /exec.
 * 5. In public/liceo-artistico/index.html metti quell'URL in:  const SHEET_API = "...";
 *
 * Ogni salvataggio aggiunge una riga al foglio "mappa" (data e JSON dei blocchi):
 * la pagina carica sempre l'ultima, e lo storico resta per tornare indietro.
 */

const FOGLIO = "mappa";

function foglio_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(FOGLIO);
  if (!sh) {
    sh = ss.insertSheet(FOGLIO);
    sh.appendRow(["salvato", "blocchi (JSON)"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// GET ?azione=mappa  -> ultima disposizione salvata
function doGet(e) {
  const sh = foglio_();
  const n = sh.getLastRow();
  if (n < 2) return json_({ ok: true, blocchi: null });
  const [salvato, testo] = sh.getRange(n, 1, 1, 2).getValues()[0];
  return json_({ ok: true, salvato: new Date(salvato).toISOString(), blocchi: JSON.parse(testo) });
}

// POST {azione:"salvaMappa", password, blocchi}
function doPost(e) {
  let dati;
  try { dati = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, errore: "Richiesta non valida." }); }
  if (dati.azione !== "salvaMappa") return json_({ ok: false, errore: "Azione sconosciuta." });

  const pw = PropertiesService.getScriptProperties().getProperty("MAPPA_PASSWORD");
  if (!pw || dati.password !== pw) return json_({ ok: false, errore: "Password errata." });

  const b = dati.blocchi;
  const valido = Array.isArray(b) && b.length > 0 && b.length < 300 && b.every(x =>
    x && typeof x.nome === "string" && x.nome.length <= 60 && /^#[0-9a-f]{6}$/i.test(x.c) &&
    ["x", "y", "w", "d", "h"].every(k => typeof x[k] === "number" && isFinite(x[k])));
  if (!valido) return json_({ ok: false, errore: "Dati della mappa non validi." });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    foglio_().appendRow([new Date(), JSON.stringify(b)]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}
