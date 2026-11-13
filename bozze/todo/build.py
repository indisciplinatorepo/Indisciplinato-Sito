#!/usr/bin/env python3
"""Genera public/todo-7c41e9a2b5/todo.json dalla scheda "To do" del foglio "Database - bandi" e dal calendario INDISCIPLINATO.

Uso: python3 bozze/todo/build.py todo.json eventi.json
- todo.json: risposta di get_values sul range 'To do'!A1:F
  (colonne: Chi | Cosa | Entro il | Fatto | Note | ID calendario)
- eventi.json: risposta di list_events sul calendario INDISCIPLINATO
  (oggetto con chiave "events", oppure direttamente la lista di eventi)

Un evento del calendario e' assegnato a una persona se il titolo inizia con
[Matteo] o [Lorenza] (anche "Matteo:" / "Lorenza:"), oppure se la descrizione
contiene "@Matteo" / "@Lorenza". Gli eventi creati dalla to do list (con ID
calendario nel foglio) non vengono ripetuti: compaiono una volta sola.
"""
import json
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "todo-7c41e9a2b5" / "todo.json"
PERSONE = ("Matteo", "Lorenza")
PREFISSO = re.compile(r"^\s*(?:\[(matteo|lorenz[ao])\]|(matteo|lorenz[ao])\s*:)\s*", re.I)


def persona(nome):
    nome = (nome or "").strip().lower()
    if nome.startswith("matteo"):
        return "Matteo"
    if nome.startswith("lorenz"):
        return "Lorenza"
    return ""


def data_iso(testo):
    testo = str(testo or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(testo, fmt).date().isoformat()
        except ValueError:
            pass
    return ""


def vero(v):
    return str(v).strip().lower() in ("true", "vero", "si", "sì", "x", "1", "fatto")


def carica(percorso, chiave):
    dati = json.loads(Path(percorso).read_text(encoding="utf-8"))
    return dati.get(chiave, []) if isinstance(dati, dict) else dati


def main(p_todo, p_eventi):
    righe = carica(p_todo, "values")
    eventi = carica(p_eventi, "events")
    todo = {p: [] for p in PERSONE}
    id_da_lista = set()

    for i, r in enumerate(righe[1:], start=2):
        r = list(r) + [""] * (6 - len(r))
        chi, cosa, entro, fatto, note, cal_id = r[:6]
        chi = persona(chi)
        if cal_id:
            id_da_lista.add(str(cal_id).strip())
        if not chi or not str(cosa).strip() or vero(fatto):
            continue
        todo[chi].append({"cosa": str(cosa).strip(), "entro": data_iso(entro),
                          "note": str(note).strip(), "fonte": "lista", "riga": i})

    appuntamenti = []
    for e in eventi:
        if e.get("status") == "cancelled":
            continue
        titolo = (e.get("summary") or "").strip()
        desc = e.get("description") or ""
        m = PREFISSO.match(titolo)
        chi = persona((m.group(1) or m.group(2)) if m else "")
        if not chi:
            for p in PERSONE:
                if re.search(r"@" + p[:6], desc, re.I):
                    chi = p
                    break
        pulito = PREFISSO.sub("", titolo) if m else titolo
        inizio, fine = e.get("start", {}), e.get("end", {})
        tutto_il_giorno = "date" in inizio
        voce = {
            "titolo": pulito or "(senza titolo)",
            "chi": chi,
            "inizio": inizio.get("date") or inizio.get("dateTime", ""),
            "fine": fine.get("date") or fine.get("dateTime", ""),
            "giorno_intero": tutto_il_giorno,
            "luogo": e.get("location", ""),
            "link": e.get("htmlLink", ""),
        }
        da_lista = e.get("id") in id_da_lista
        # Le scadenze nate dalla to do list stanno gia' nella colonna della persona.
        if chi and not da_lista:
            todo[chi].append({"cosa": voce["titolo"], "entro": voce["inizio"][:10],
                              "note": "", "fonte": "calendario", "link": voce["link"]})
        if not da_lista:
            appuntamenti.append(voce)

    for p in PERSONE:
        todo[p].sort(key=lambda t: (t["entro"] or "9999", t.get("riga", 0)))
    appuntamenti.sort(key=lambda a: a["inizio"])

    uscita = {
        "aggiornato": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "oggi": date.today().isoformat(),
        "todo": todo,
        "appuntamenti": appuntamenti,
    }
    OUT.write_text(json.dumps(uscita, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Matteo {len(todo['Matteo'])}, Lorenza {len(todo['Lorenza'])}, "
          f"appuntamenti {len(appuntamenti)} -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
