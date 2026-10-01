"""Octavillas A5 (148 × 210 mm) de acceso al área de cliente de ProPymes · 3 propuestas."""
import base64, io
from pathlib import Path
import qrcode, cairosvg
from PIL import Image
from pypdf import PdfWriter, PdfReader

OUT = Path(__file__).parent
URL = "https://app.propymesasesores.es"
NAVY, TAN, CREAM, TAN_DARK, INK = "#07213d", "#d2b48c", "#f4ede5", "#8a6a3e", "#3b4a5c"
W, H = 148, 210
SANS = "Liberation Sans, DejaVu Sans, sans-serif"

USER, PASSWORD = "Cliente", "prueba"
TITLE = "Tu área de cliente, siempre contigo"
INTRO = ["Consulta tu documentación, tus declaraciones y", "habla con tu asesor desde el móvil o el ordenador."]
STEPS = [("Escanea", ["el código QR o entra en", "app.propymesasesores.es"]),
         ("Accede", ["con el usuario y la", "contraseña de abajo"]),
         ("Consulta", ["tus documentos y", "escríbenos cuando quieras"])]
AVISO = ["La aplicación está en fase de vista previa. Por ahora no adjuntes",
         "ni envíes documentación a través de ella: entrégala por los canales",
         "habituales del despacho."]


def img(name, x, y, w=None, h=None, anchor="start"):
    iw, ih = Image.open(OUT / name).size
    if w is None: w = h * iw / ih
    if h is None: h = w * ih / iw
    if anchor == "middle": x -= w / 2
    b64 = base64.b64encode((OUT / name).read_bytes()).decode()
    return f'<image x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" href="data:image/png;base64,{b64}"/>'


def qr(x, y, size, pad=2.5, radius=2.5):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    q.add_data(URL); q.make(fit=True)
    m = q.get_matrix(); n = len(m); c = size / n
    d = "".join(f"M{x + j * c:.3f} {y + i * c:.3f}h{c:.3f}v{c:.3f}h-{c:.3f}z" for i, r in enumerate(m) for j, v in enumerate(r) if v)
    return (f'<rect x="{x - pad}" y="{y - pad}" width="{size + 2 * pad}" height="{size + 2 * pad}" rx="{radius}" fill="#fff"/>'
            f'<path d="{d}" fill="{NAVY}" shape-rendering="crispEdges"/>')


def t(x, y, s, size, fill, weight="normal", anchor="start", spacing=0):
    return (f'<text x="{x}" y="{y}" font-family="{SANS}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}" letter-spacing="{spacing}">{s}</text>')


def lines(x, y, rows, size, fill, lh=1.45, **kw):
    return "".join(t(x, y + i * size * lh, r, size, fill, **kw) for i, r in enumerate(rows))


def fields(x, y, w, label_color=TAN_DARK, line=NAVY, user="", password=""):
    return (t(x, y, "USUARIO", 2.6, label_color, "bold", spacing=.6)
            + (t(x + 1, y + 6.6, user, 5, NAVY, "bold") if user else "")
            + (t(x + 1, y + 21.6, password, 5, NAVY, "bold") if password else "")
            + f'<line x1="{x}" y1="{y + 8}" x2="{x + w}" y2="{y + 8}" stroke="{line}" stroke-width=".35"/>'
            + t(x, y + 15, "CONTRASEÑA", 2.6, label_color, "bold", spacing=.6)
            + f'<line x1="{x}" y1="{y + 23}" x2="{x + w}" y2="{y + 23}" stroke="{line}" stroke-width=".35"/>')


def aviso(x, y, w, size=2.55):
    h = 4.2 + len(AVISO) * size * 1.45
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h:.2f}" rx="2" fill="#fff" stroke="{TAN}" stroke-width=".4"/>'
            f'<circle cx="{x + 5}" cy="{y + 5.3}" r="2.1" fill="{TAN}"/>' + t(x + 5, y + 6.35, "!", 3, NAVY, "bold", "middle")
            + t(x + 9.5, y + 5.2, f'<tspan font-weight="bold">Aviso · vista previa.</tspan> {AVISO[0]}', size, NAVY)
            + lines(x + 9.5, y + 5.2 + size * 1.45, AVISO[1:], size, NAVY))


def steps(x, y, col_w, num_fill, num_text, head, body):
    out = ""
    for i, (h, b) in enumerate(STEPS):
        cx = x + i * col_w
        out += (f'<circle cx="{cx + 4}" cy="{y}" r="4" fill="{num_fill}"/>' + t(cx + 4, y + 1.35, str(i + 1), 3.8, num_text, "bold", "middle")
                + t(cx, y + 10, h, 3.6, head, "bold") + lines(cx, y + 15, b, 2.6, body))
    return out


def page(content, bg="#fff"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">'
            f'<rect width="{W}" height="{H}" fill="{bg}"/>{content}</svg>')


# ------------------------------------------------ A · Marino: cabecera oscura, QR protagonista
A = page(
    f'<rect width="{W}" height="104" fill="{NAVY}"/>'
    + f'<circle cx="{W + 10}" cy="-6" r="62" fill="#0b2a4c"/>'
    + img("v-oscuro.png", W / 2, 12, w=52, anchor="middle")
    + t(W / 2, 57, TITLE, 6.2, "#fff", "bold", "middle")
    + lines(W / 2, 64.5, INTRO, 3.1, "#c9d3de", anchor="middle")
    + qr(W / 2 - 17, 77, 34, pad=3.5, radius=3)
    + t(W / 2, 123, "ESCANÉAME · app.propymesasesores.es", 2.6, TAN_DARK, "bold", "middle", .5)
    + steps(18, 133, 40, NAVY, "#fff", NAVY, INK)
    + f'<rect x="14" y="153" width="{W - 28}" height="35" rx="3" fill="{CREAM}"/>'
    + fields(20, 161, W - 40)
    + aviso(14, 191.5, W - 28, 2.35)
    + f'<rect y="{H - 2}" width="{W}" height="2" fill="{TAN}"/>',
    "#fbf8f3")

# ------------------------------------------------ B · Crema editorial: todo claro, QR a la izquierda
B = page(
    f'<rect width="4" height="{H}" fill="{TAN}"/>'
    + img("h-claro.png", 16, 16, w=78)
    + f'<line x1="16" y1="38" x2="{W - 16}" y2="38" stroke="{TAN}" stroke-width=".5"/>'
    + t(16, 54, "Tu área de cliente,", 8, NAVY, "bold") + t(16, 63.5, "siempre contigo", 8, TAN_DARK, "bold")
    + lines(16, 73, INTRO, 3.2, INK)
    + qr(19, 89, 42, pad=3, radius=2.5)
    + f'<rect x="16" y="86" width="48" height="48" rx="2.5" fill="none" stroke="{NAVY}" stroke-width=".6"/>'
    + t(40, 140, "ESCANÉAME", 2.6, NAVY, "bold", "middle", .6)
    + "".join(f'<circle cx="76" cy="{92 + i * 16}" r="3.6" fill="{NAVY}"/>' + t(76, 93.3 + i * 16, str(i + 1), 3.6, "#fff", "bold", "middle")
              + t(83, 92.6 + i * 16, h, 3.6, NAVY, "bold") + lines(83, 97.4 + i * 16, b, 2.55, INK)
              for i, (h, b) in enumerate(STEPS))
    + f'<rect x="16" y="147" width="{W - 32}" height="40" rx="3" fill="#fff" stroke="#e7dccb" stroke-width=".4"/>'
    + t(22, 154.5, "TUS DATOS DE ACCESO", 2.4, NAVY, "bold", spacing=.6)
    + fields(22, 161, W - 44, user=USER, password=PASSWORD)
    + aviso(16, 191, W - 32, 2.3),
    CREAM)

# ------------------------------------------------ C · Recortable: octavilla + tarjeta para guardar
C = page(
    f'<rect width="{W}" height="36" fill="{NAVY}"/>'
    + img("h-oscuro.png", 14, 11, w=72)
    + t(W - 14, 21, "ÁREA DE CLIENTE", 2.6, TAN, "bold", "end", .6)
    + t(14, 52, TITLE, 6.4, NAVY, "bold")
    + lines(14, 60, INTRO, 3.1, INK)
    + "".join(f'<circle cx="18" cy="{79 + i * 14}" r="3.6" fill="{TAN}"/>' + t(18, 80.3 + i * 14, str(i + 1), 3.6, NAVY, "bold", "middle")
              + t(25, 79.6 + i * 14, h, 3.5, NAVY, "bold") + t(25, 84.2 + i * 14, " ".join(b), 2.55, INK)
              for i, (h, b) in enumerate(STEPS))
    + qr(W - 42, 74, 28, pad=2.5)
    + f'<rect x="{W - 44.5}" y="71.5" width="33" height="33" rx="2.5" fill="none" stroke="{NAVY}" stroke-width=".5"/>'
    + t(W - 28, 109, "ESCANÉAME", 2.3, NAVY, "bold", "middle", .5)
    + aviso(14, 116, W - 28, 2.4)
    # línea de corte
    + f'<line x1="6" y1="141" x2="{W - 6}" y2="141" stroke="#9aa3ad" stroke-width=".35" stroke-dasharray="1.6 1.4"/>'
    + t(W / 2, 138.4, "Recorta por la línea y guarda tus datos de acceso", 2.4, "#7b8794", anchor="middle")
    # tarjeta recortable (85 × 55)
    + f'<g transform="translate({(W - 100) / 2} 148)">'
    + f'<rect width="100" height="58" rx="3" fill="{CREAM}" stroke="{TAN}" stroke-width=".4"/>'
    + f'<rect width="100" height="12" rx="3" fill="{NAVY}"/><rect y="9" width="100" height="3" fill="{NAVY}"/>'
    + img("h-oscuro.png", 5, 3.3, w=34)
    + t(95, 7.6, "app.propymesasesores.es", 2.3, TAN, "bold", "end")
    + t(6, 21, "Tus datos de acceso", 3.6, NAVY, "bold")
    + t(6, 29, "USUARIO", 2.2, TAN_DARK, "bold", spacing=.5)
    + f'<line x1="6" y1="36" x2="74" y2="36" stroke="{NAVY}" stroke-width=".3"/>'
    + t(6, 42, "CONTRASEÑA", 2.2, TAN_DARK, "bold", spacing=.5)
    + f'<line x1="6" y1="49" x2="74" y2="49" stroke="{NAVY}" stroke-width=".3"/>'
    + qr(79, 27, 16, pad=1.6, radius=1.5)
    + "</g>",
    "#fff")

if __name__ == "__main__":
    variants = {"A-marino": A, "B-crema": B, "C-recortable": C}
    for name, svg in variants.items():
        (OUT / f"octavilla-{name}.svg").write_text(svg, encoding="utf8")
        cairosvg.svg2png(bytestring=svg.encode(), write_to=str(OUT / f"octavilla-{name}.png"), output_width=1240)
        cairosvg.svg2pdf(bytestring=svg.encode(), write_to=str(OUT / f"octavilla-{name}-A5.pdf"))
        # A4 apaisado con 2 octavillas A5 para imprimir en casa
        body = svg[svg.index(">") + 1:-6]
        a4 = (f'<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 297 210"><rect width="297" height="210" fill="#fff"/>'
              f'<svg x="0" y="0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{body}</svg>'
              f'<svg x="{297 - W}" y="0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{body}</svg></svg>')
        cairosvg.svg2pdf(bytestring=a4.encode(), write_to=str(OUT / f"octavilla-{name}-2xA4.pdf"))

    # comparativa
    ims = [Image.open(OUT / f"octavilla-{n}.png").convert("RGB") for n in variants]
    w, h = ims[0].size; s = .5
    ims = [i.resize((int(w * s), int(h * s))) for i in ims]
    grid = Image.new("RGB", (ims[0].width * 3 + 40, ims[0].height + 20), "#d9d9d9")
    for k, im in enumerate(ims):
        grid.paste(im, (10 + k * (im.width + 10), 10))
    grid.save(OUT / "octavillas-comparativa.png")
    print("ok")
