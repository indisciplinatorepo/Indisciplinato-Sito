# Indisciplinato – sito

Sito di www.indisciplinato.it (Associazione Vinaccia ETS), pubblicato su Cloudflare.

- `public/` – i file del sito: landing "Stiamo tornando" (IT/EN), note legali, video, logo, file .ics
- `wrangler.jsonc` – configurazione Cloudflare: serve la cartella `public/` così com'è, senza build

Ogni push su `main` viene pubblicato automaticamente da Cloudflare.

Accessibilità: obiettivo WCAG 2.2 AA. Analisi e decisioni di progetto nel repo privato `indisciplinato` (cartella `sito/`).
