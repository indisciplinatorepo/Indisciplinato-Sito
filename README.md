# Indisciplinato – sito

Sito di www.indisciplinato.it (Associazione Vinaccia ETS), pubblicato su Cloudflare.

- `public/` – i file del sito: landing "Stiamo tornando" (IT/EN), note legali, video, logo, file .ics
- `wrangler.jsonc` – configurazione Cloudflare: serve la cartella `public/` così com'è, senza build

Ogni push su `main` viene pubblicato automaticamente da Cloudflare.

Accessibilità: obiettivo WCAG 2.2 AA. Analisi e decisioni di progetto nel repo privato `indisciplinato` (cartella `sito/`).

## Pagina Michelerio (Liceo Artistico)

- `public/liceo-artistico/` – mappa 3D del cortile costruita sulla planimetria CAD (Tav. 2 pavimentazione, in metri), con vista "Pianta CAD" in scala, modalità *Modifica*, modulo "Suggerisci un'idea" con captcha, idee in card, link utili. Nessuna libreria esterna.
- `public/liceo-artistico/michelerio-cad.webp` – planimetria resa in immagine (48 px/m, origine = filo interno muri ovest/nord del cortile).
- `strumenti/mappa-apps-script.gs` – un solo Apps Script per salvataggio online della mappa (password) e raccolta idee (captcha firmato lato server). Istruzioni nel file; poi metti l'URL in `SHEET_API`.
