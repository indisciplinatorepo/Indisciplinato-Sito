"""Genera index.html della bozza festival: logo dalla landing pubblicata + produttori dal file YAML."""
import html, pathlib, re, yaml
qui = pathlib.Path(__file__).parent
landing = (qui.parent.parent / "public" / "index.html").read_text(encoding="utf-8")
logo = re.search(r'<svg class="brand".*?</svg>', landing, re.S).group(0)
prod = yaml.safe_load(open(qui / "produttori-2025.yaml", encoding="utf-8"))
def li(p):
    luogo = ", ".join(x for x in [p["comune"], p["regione"]] if x)
    vini = ", ".join(p["vini"][:4])
    s = f'<li data-regione="{html.escape(p["regione"])}"><span class="name">{html.escape(p["nome"])}</span><span class="where">{html.escape(luogo)}</span>'
    return s + (f'<span class="wines">{html.escape(vini)}</span>' if vini else "") + "</li>"
blocco = '<ul class="producers">' + "".join(li(p) for p in prod) + "</ul>"
t = (qui / "template.html").read_text(encoding="utf-8").replace("{{LOGO}}", logo).replace("{{PRODUTTORI}}", blocco)
(qui / "index.html").write_text(t, encoding="utf-8")
print("ok", len(prod))
