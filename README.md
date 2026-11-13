# Indisciplinato – sito

Sito di www.indisciplinato.it (Associazione Vinaccia ETS), pubblicato su Cloudflare.

- `public/` – i file del sito: landing "Stiamo tornando" (IT/EN), note legali, video, logo, file .ics
- `wrangler.jsonc` – configurazione Cloudflare: serve la cartella `public/` così com'è, senza build; `/api/*` va al Worker in `src/worker.js`

Ogni push su `main` viene pubblicato automaticamente da Cloudflare.

Accessibilità: obiettivo WCAG 2.2 AA. Analisi e decisioni di progetto nel repo privato `indisciplinato` (cartella `sito/`).

## Pagina Michelerio (Liceo Artistico)

- `public/liceo-artistico/` – mappa 3D del cortile costruita sulla planimetria CAD (Tav. 2 pavimentazione, in metri), vista "Pianta CAD" in scala, braille italiano disegnato a punti, idee in card, modulo "Suggerisci un'idea" con captcha, link utili.
- `public/liceo-artistico/michelerio-cad.webp` – planimetria resa in immagine (48 px/m, origine = filo interno muri ovest/nord del cortile).
- `src/worker.js` – unico codice lato server: risponde solo a `/api/*` (captcha e idee). I dati stanno in un Durable Object SQLite, creato da Cloudflare al deploy: nulla da configurare.
- Moderazione delle idee (facoltativa): in Cloudflare › Workers › indisciplinato-sito › Impostazioni › Variabili, aggiungi il secret `ADMIN_KEY`; poi `POST /api/idee/nascondi` con `{ "id": N, "chiave": "..." }` nasconde un'idea (`/api/idee/mostra` la rimette).

## Pagina bandi (riservata)

- `public/bandi-1868203d96/` – elenco dei bandi aperti a cui può partecipare un'associazione iscritta al RUNTS (Piemonte e fondazioni), divisi in quattro categorie. Non è linkata dal sito ed è `noindex`; chi ha il link la apre.
- I dati vengono dal Google Sheet "Database - bandi" (foglio `Bandi`). Un'attività programmata li aggiorna ogni giorno, rigenera `bandi.json` con `bozze/bandi/build.py` e fa push su `main`.

## Pagina to do (riservata)

- `public/todo-7c41e9a2b5/` – to do list di Matteo e Lorenza più gli appuntamenti del calendario INDISCIPLINATO. Non linkata dal sito, `noindex`.
- Le cose da fare vengono dalla scheda "To do" del Google Sheet "Database - bandi", gli appuntamenti dal calendario INDISCIPLINATO. Nel calendario, `[Matteo]` o `[Lorenza]` all'inizio del titolo assegna l'evento a quella persona.
- Un'attività programmata ogni ora (7-23) legge foglio e calendario, aggiunge al calendario le cose con data, rigenera `todo.json` con `bozze/todo/build.py` e fa push su `main`.

## Area riservata (con password)

- `public/area-e8b40baf0f/` – pagina di accesso con i pulsanti To do, Gestionale e Bandi.
- La pagina di accesso, `/bandi-1868203d96/` e `/todo-7c41e9a2b5/` chiedono nome utente e password (HTTP Basic), controllati da `src/worker.js` (vedi `run_worker_first` in `wrangler.jsonc`). Nel codice c'è solo l'impronta SHA-256 di `utente:password`.
- Le credenziali sono su Notion: Credenziali › Clienti › Indisciplinato.
- Per cambiarle: calcola `sha256("utente:password")` e mettilo nel secret `AREA_HASH` del Worker su Cloudflare (Impostazioni › Variabili), oppure aggiorna la costante `AREA_HASH` in `src/worker.js`.
