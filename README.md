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
