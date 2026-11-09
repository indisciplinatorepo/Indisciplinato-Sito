# Indisciplinato – sito

Sito di www.indisciplinato.it (Associazione Vinaccia ETS), pubblicato su Cloudflare.

- `public/` – i file del sito: landing "Stiamo tornando" (IT/EN), note legali, video, logo, file .ics
- `wrangler.jsonc` – configurazione Cloudflare: serve la cartella `public/` così com'è, senza build

Ogni push su `main` viene pubblicato automaticamente da Cloudflare.

Accessibilità: obiettivo WCAG 2.2 AA. Analisi e decisioni di progetto nel repo privato `indisciplinato` (cartella `sito/`).

## Mappa sensoriale del Michelerio

- `public/liceo-artistico/` – mappa 3D interattiva del cortile (Indisciplinato × Liceo Artistico Alfieri), modificabile dalla pagina con il pulsante *Modifica*. Nessuna libreria esterna.
- `strumenti/mappa-apps-script.gs` – Apps Script per il salvataggio online con password (istruzioni nel file). Finché `SHEET_API` nella pagina è vuoto, le modifiche restano sul dispositivo e si condividono con *Scarica file* / *Carica file*.
