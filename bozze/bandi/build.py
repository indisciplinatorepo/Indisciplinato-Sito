#!/usr/bin/env python3
"""Genera public/bandi-1868203d96/bandi.json dal Google Sheet "Database - bandi".

Uso: python3 bozze/bandi/build.py valori.json
dove valori.json e' la risposta di get_values sul range Bandi!A1:L
(un oggetto con chiave "values", oppure direttamente la lista di righe).
"""
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "bandi-1868203d96" / "bandi.json"

CAMPI = {
    "ID": "id",
    "Data inserimento": "inserito",
    "Titolo": "titolo",
    "Ente": "ente",
    "Fonte": "fonte",
    "Categoria": "categoria",
    "Scadenza": "scadenza",
    "Contributo": "contributo",
    "Destinatari": "destinatari",
    "Sintesi": "sintesi",
    "Link": "link",
    "Stato": "stato",
}


def data_iso(testo):
    testo = (testo or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(testo, fmt).date().isoformat()
        except ValueError:
            pass
    return testo


def main(percorso):
    dati = json.loads(Path(percorso).read_text(encoding="utf-8"))
    righe = dati.get("values", []) if isinstance(dati, dict) else dati
    if not righe:
        sys.exit("Nessuna riga nel foglio")
    intestazioni = [h.strip() for h in righe[0]]
    oggi = date.today().isoformat()
    bandi = []
    for riga in righe[1:]:
        riga = list(riga) + [""] * (len(intestazioni) - len(riga))
        rec = {}
        for nome, valore in zip(intestazioni, riga):
            chiave = CAMPI.get(nome)
            if chiave:
                rec[chiave] = str(valore).strip()
        if not rec.get("titolo"):
            continue
        rec["scadenza"] = data_iso(rec.get("scadenza"))
        rec["inserito"] = data_iso(rec.get("inserito"))
        # Sulla pagina vanno solo i bandi aperti: quelli con scadenza passata non si pubblicano.
        if rec["scadenza"][:4].isdigit() and rec["scadenza"] < oggi:
            continue
        if rec.get("stato") and rec["stato"] != "Aperto":
            continue
        bandi.append(rec)
    uscita = {
        "aggiornato": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "bandi": bandi,
    }
    OUT.write_text(json.dumps(uscita, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(bandi)} bandi scritti in {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
