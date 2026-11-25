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

## Area riservata

- `public/area-e8b40baf0f/` – pagina di accesso con i pulsanti To do, Gestionale e Bandi. Come le altre pagine riservate: non linkata dal sito e `noindex`, senza password.

## Pagina grafica e social (riservata)

- `public/grafica-e-social/` – pagina per i collaboratori, non linkata dal sito e `noindex` (pulsante nell'area riservata). Tre schede:
  - **Home**: tempistiche gennaio-maggio 2027 di grafiche e social insieme; prima scadenza le bozze al Comune per il patrocinio entro il 31 gennaio.
  - **Grafiche**: archivio delle grafiche 2024 e 2025 raggruppate per famiglia (locandina, piastrelle, manifesto social, produttori, materiali in fiera, partner, prima edizione); ogni famiglia si apre con tutte le declinazioni. Poi colori e caratteri.
  - **Social**: com'è andata la comunicazione 2025 (ricostruita dalle date dei file su Drive), piano 2027 mese per mese e template per rubrica.
- Immagini dell'archivio in `img/archivio/`, ricavate dai file di Drive "INDISCIPLINATO 2025 › Grafica". I dati sono scritti nel file `index.html`.

## Disponibilità produttori 2027

- `public/disponibilita/` – modulo per i produttori invitati: nome azienda, referente, email o telefono (obbligatori), sabato 15 e/o domenica 16 maggio 2027, nota facoltativa "perché non potrai esserci", domanda di verifica. `noindex`; si può precompilare l'azienda con `?azienda=Nome`.
- Le risposte vanno al Worker (`POST /api/disponibilita`, stesso Durable Object delle idee) e si leggono nella pagina riservata `public/disponibilita-95f986c475/` (pulsante nell'area riservata), con riepilogo e CSV.
- Quote 2027: 70 € per una giornata, 120 € per entrambe (anche nel gestionale, sezione Produttori › Giornate).
