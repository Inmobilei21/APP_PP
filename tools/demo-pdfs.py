#!/usr/bin/env python3
"""Genera los PDF ficticios (lorem ipsum) de la demostración del área de cliente.

Uso: python3 tools/demo-pdfs.py   → escribe brand/demo/pdf/*.pdf y brand/demo/documentos.json
Requiere: pip install cairosvg pillow
"""
import base64, io, json, random
from pathlib import Path
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "brand" / "demo" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
NAVY, TAN, CREAM, INK = "#07213d", "#d2b48c", "#f4ede5", "#3b4a5c"
W, H = 210, 297
SANS = "Liberation Sans, DejaVu Sans, sans-serif"

LOREM = ("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore "
         "magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo "
         "consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. "
         "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. "
         "Curabitur pretium tincidunt lacus, nulla gravida orci a odio, nullam varius turpis et commodo pharetra. "
         "Integer vitae justo eget magna fermentum iaculis eu non diam phasellus vestibulum lorem sed risus.").split()

# (archivo, título, apartado, fecha, tipo)
DOCS = [
    ("factura-2026-008", "Factura 2026-008", "Facturas emitidas", "2026-02-12", "factura"),
    ("factura-2026-019", "Factura 2026-019", "Facturas emitidas", "2026-03-24", "factura"),
    ("factura-2026-027", "Factura 2026-027", "Facturas emitidas", "2026-05-08", "factura"),
    ("factura-2026-033", "Factura 2026-033", "Facturas emitidas", "2026-06-19", "factura"),
    ("factura-2026-041", "Factura 2026-041", "Facturas emitidas", "2026-09-15", "factura"),
    ("factura-2026-042", "Factura 2026-042", "Facturas emitidas", "2026-09-22", "factura"),
    ("factura-2026-043", "Factura 2026-043", "Facturas emitidas", "2026-09-26", "factura"),
    ("fra-asesoria-marzo", "Factura proveedor · marzo", "Facturas recibidas", "2026-03-05", "factura"),
    ("fra-material-oficina-mayo", "Factura material de oficina · mayo", "Facturas recibidas", "2026-05-14", "factura"),
    ("fra-suministros-septiembre", "Factura suministros · septiembre", "Facturas recibidas", "2026-09-10", "factura"),
    ("fra-telefonia-septiembre", "Factura telefonía · septiembre", "Facturas recibidas", "2026-09-05", "factura"),
    ("fra-alquiler-local-septiembre", "Factura alquiler del local · septiembre", "Facturas recibidas", "2026-09-01", "factura"),
    ("extracto-bancario-agosto", "Extracto bancario · agosto 2026", "Bancos", "2026-09-02", "extracto"),
    ("extracto-bancario-septiembre", "Extracto bancario · septiembre 2026", "Bancos", "2026-09-27", "extracto"),
    ("resumen-contable-3t-2026", "Resumen contable · 3T 2026", "Contabilidad", "2026-09-25", "informe"),
    ("balance-sumas-saldos-3t-2026", "Balance de sumas y saldos · 3T 2026", "Contabilidad", "2026-09-25", "extracto"),
    ("cuentas-anuales-2025", "Cuentas anuales 2025", "Contabilidad", "2026-07-28", "informe"),
    ("modelo-303-1t-2026", "Modelo 303 · 1T 2026", "Declaraciones", "2026-04-17", "modelo"),
    ("modelo-111-1t-2026", "Modelo 111 · 1T 2026", "Declaraciones", "2026-04-17", "modelo"),
    ("modelo-303-2t-2026", "Modelo 303 · 2T 2026", "Declaraciones", "2026-07-18", "modelo"),
    ("modelo-111-2t-2026", "Modelo 111 · 2T 2026", "Declaraciones", "2026-07-18", "modelo"),
    ("modelo-200-2025", "Modelo 200 · Impuesto sobre Sociedades 2025", "Declaraciones", "2026-07-24", "modelo"),
    ("modelo-390-2025", "Modelo 390 · Resumen anual IVA 2025", "Declaraciones", "2026-01-28", "modelo"),
    ("requerimiento-aeat-2026", "Requerimiento de información AEAT", "Reclamaciones", "2026-06-11", "carta"),
    ("escrito-alegaciones-2026", "Escrito de alegaciones", "Reclamaciones", "2026-06-24", "carta"),
]


def logo_uri():
    im = Image.open(ROOT / "brand" / "oficial" / "horizontal-arena-blanco.png").convert("RGBA")
    im = im.crop(im.getbbox()); im.thumbnail((900, 900))
    buf = io.BytesIO(); im.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode(), im.width / im.height


LOGO, LOGO_RATIO = logo_uri()


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def t(x, y, s, size, fill=INK, weight="normal", anchor="start", spacing=0):
    return (f'<text x="{x}" y="{y}" font-family="{SANS}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'text-anchor="{anchor}" letter-spacing="{spacing}">{esc(s)}</text>')


def paragraph(rng, x, y, width_chars=92, lines=5, size=3.2):
    words, out, row = [rng.choice(LOREM) for _ in range(lines * 16)], [], ""
    for w in words:
        if len(row) + len(w) + 1 > width_chars:
            out.append(row); row = ""
            if len(out) == lines:
                break
        row = (row + " " + w).strip()
    out[0] = out[0][0].upper() + out[0][1:]
    return "".join(t(x, y + i * size * 1.55, r + ("." if i == len(out) - 1 else ""), size) for i, r in enumerate(out)), y + len(out) * size * 1.55


def fecha(iso):
    y, m, d = iso.split("-")
    return f"{d}/{m}/{y}"


def table(rng, y, kind):
    if kind == "factura":
        head, rows = ["Concepto", "Unidades", "Precio", "Importe"], []
        for _ in range(rng.randint(3, 5)):
            u, p = rng.randint(1, 12), rng.randint(20, 480)
            rows.append([" ".join(rng.choice(LOREM) for _ in range(3)).capitalize(), str(u), f"{p:,.2f} €".replace(",", "X").replace(".", ",").replace("X", "."), f"{u * p:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")])
        cols = [20, 104, 150, 190]
        table.total = sum(float(r[3].replace(' €','').replace('.','').replace(',','.')) for r in rows)
    elif kind == "extracto":
        head, rows, saldo = ["Fecha", "Concepto", "Importe", "Saldo"], [], rng.randint(8000, 25000)
        for i in range(8):
            imp = rng.choice([-1, 1]) * rng.randint(40, 2400); saldo += imp
            rows.append([f"{rng.randint(1, 28):02d}/09/2026", " ".join(rng.choice(LOREM) for _ in range(3)).capitalize(), f"{imp:+,.2f} €".replace(",", "X").replace(".", ",").replace("X", "."), f"{saldo:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")])
        cols = [20, 48, 150, 190]
    elif kind == "modelo":
        head, rows = ["Casilla", "Descripción", "", "Importe"], []
        for c in rng.sample(range(1, 90), 6):
            rows.append([f"[{c:02d}]", " ".join(rng.choice(LOREM) for _ in range(4)).capitalize(), "", f"{rng.randint(100, 30000):,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")])
        cols = [20, 42, 150, 190]
    else:
        head, rows = ["Partida", "Ejercicio actual", "", "Ejercicio anterior"], []
        for _ in range(6):
            rows.append([" ".join(rng.choice(LOREM) for _ in range(3)).capitalize(), f"{rng.randint(1000, 90000):,.2f} €".replace(",", "X").replace(".", ",").replace("X", "."), "", f"{rng.randint(1000, 90000):,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")])
        cols = [20, 120, 150, 190]
    anchors = ["start", "start", "end", "end"] if kind != "informe" else ["start", "end", "end", "end"]
    xs = [cols[0], cols[1], cols[2], cols[3]] if kind != "informe" else [cols[0], 145, 150, cols[3]]
    out = f'<rect x="18" y="{y}" width="174" height="8" rx="1" fill="{NAVY}"/>'
    out += "".join(t(xs[i] + (2 if anchors[i] == "start" else -2), y + 5.4, h, 3, "#fff", "bold", anchors[i]) for i, h in enumerate(head) if h)
    y += 8
    for r, row in enumerate(rows):
        if r % 2:
            out += f'<rect x="18" y="{y}" width="174" height="7.5" fill="{CREAM}"/>'
        out += "".join(t(xs[i] + (2 if anchors[i] == "start" else -2), y + 5, v, 3, INK, "normal", anchors[i]) for i, v in enumerate(row) if v)
        y += 7.5
    return out + f'<line x1="18" y1="{y}" x2="192" y2="{y}" stroke="{TAN}" stroke-width=".4"/>', y


def page(slug, title, folder, date, kind):
    rng = random.Random(slug)
    body = f'<rect width="{W}" height="{H}" fill="#fff"/>'
    body += f'<rect width="{W}" height="34" fill="{NAVY}"/><rect y="34" width="{W}" height="1.6" fill="{TAN}"/>'
    body += f'<image x="18" y="9" width="{16 * LOGO_RATIO:.1f}" height="16" href="{LOGO}"/>'
    body += t(192, 16, folder.upper(), 3, TAN, "bold", "end", .6) + t(192, 22.5, f"Ref. {slug.upper()[:18]}", 2.8, "#c9d3de", anchor="end")
    body += t(18, 52, title, 7, NAVY, "bold")
    meta = [("Cliente", "Cliente de demostración"), ("Fecha", fecha(date)), ("Apartado", folder)]
    body += "".join(t(18 + i * 60, 61, k.upper(), 2.4, "#8a6a3e", "bold", spacing=.4) + t(18 + i * 60, 66.5, v, 3.4, NAVY, "bold") for i, (k, v) in enumerate(meta))
    p, y = paragraph(rng, 18, 80)
    body += p
    tb, y = table(rng, y + 6, kind)
    body += tb
    p, y = paragraph(rng, 18, y + 12, lines=6)
    body += p
    if kind == "factura":
        body += f'<rect x="120" y="{y + 6}" width="72" height="12" rx="1.5" fill="{NAVY}"/>' + t(124, y + 13.6, "TOTAL", 3.2, TAN, "bold") + t(188, y + 13.6, f"{table.total:,.2f} €".replace(",", "X").replace(".", ",").replace("X", "."), 4.2, "#fff", "bold", "end")
        y += 18
    p, _ = paragraph(rng, 18, y + 14, lines=4)
    body += p
    # marca de agua y pie
    body += f'<text x="105" y="170" font-family="{SANS}" font-size="30" font-weight="bold" fill="{TAN}" fill-opacity=".13" text-anchor="middle" transform="rotate(-35 105 170)" letter-spacing="3">DEMOSTRACIÓN</text>'
    body += f'<line x1="18" y1="277" x2="192" y2="277" stroke="{TAN}" stroke-width=".4"/>'
    body += t(18, 283, "Documento ficticio generado para la demostración del área de cliente de ProPymes Asesores.", 2.6, "#7b8794")
    body += t(192, 283, "Página 1 de 1", 2.6, "#7b8794", anchor="end")
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">{body}</svg>'


index = []
for slug, title, folder, date, kind in DOCS:
    cairosvg.svg2pdf(bytestring=page(slug, title, folder, date, kind).encode(), write_to=str(OUT / f"{slug}.pdf"))
    y, m = int(date[:4]), int(date[5:7])
    if folder in ("Facturas emitidas", "Facturas recibidas"):
        path = f"{folder}/{y}/{(m - 1) // 3 + 1}T"
    elif folder == "Declaraciones":
        period = next((q for q in ("1T", "2T", "3T", "4T") if q in title), "")
        path = f"Declaraciones/{title.split()[-1]}" + (f"/{period}" if period else "")
    else:
        path = f"{folder}/{y}"
    index.append({"file": f"{slug}.pdf", "title": title, "folder": folder, "date": date, "path": path})
(OUT.parent / "documentos.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf8")
print(len(index), "PDF de demostración en", OUT)
