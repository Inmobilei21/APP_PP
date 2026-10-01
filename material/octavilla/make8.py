"""Octavilla de ProPymes en 1/8 de A4 (74,25 × 105 mm), anverso y reverso.

Genera:
  octavilla-8xA4.pdf      2 páginas A4 apaisado: 8 anversos y 8 reversos (imprimir a doble cara).
  octavilla-8-unidad.pdf  1 octavilla a tamaño real (anverso y reverso), para imprenta.
  octavilla-8-anverso.png / octavilla-8-reverso.png   vistas previas.
Usa los helpers y el logo de make.py.   python3 make8.py
"""
from pathlib import Path
import cairosvg
from pypdf import PdfWriter, PdfReader
import make
from make import t, lines, img, qr, NAVY, TAN, CREAM, TAN_DARK, INK, USER, PASSWORD

OUT = Path(__file__).parent
W, H = 297 / 4, 210 / 2          # 74,25 × 105 mm
PHONE, EMAIL = "677 53 39 27", "info@propymesasesores.es"
# Fondo arena más intenso que el crema de pantalla: el crema casi no se ve al imprimir
BG, STRIPE = "#e4d0b3", "#b8925f"


def card(content, bg):
    return f'<rect width="{W}" height="{H}" fill="{bg}"/>{content}'


FRONT = card(
    f'<rect width="{W}" height="2.2" fill="{STRIPE}"/>'
    + f'<rect x="6" y="5.5" width="{W - 12}" height="17" rx="2.2" fill="#fff"/>'
    + img("h-claro.png", W / 2, 9.7, w=50, anchor="middle")
    + t(W / 2, 33, "Tu área de cliente,", 4.6, NAVY, "bold", "middle")
    + t(W / 2, 38.6, "siempre contigo", 4.6, TAN_DARK, "bold", "middle")
    + lines(W / 2, 44.2, ["Tu documentación y tu asesor,", "en el móvil o el ordenador."], 2.35, INK, anchor="middle")
    + qr(W / 2 - 15, 53, 30, pad=2.2, radius=1.8)
    + f'<rect x="{W / 2 - 17.6}" y="50.4" width="35.2" height="35.2" rx="2.2" fill="none" stroke="{NAVY}" stroke-width=".45"/>'
    + t(W / 2, 91.2, "ESCANÉAME", 2.3, NAVY, "bold", "middle", .5)
    + t(W / 2, 96.2, "app.propymesasesores.es", 2.5, TAN_DARK, "bold", "middle"),
    BG)

STEPS = [("Escanea", ["el QR o entra en la web"]), ("Accede", ["con tu usuario y contraseña"]),
         ("Consulta", ["sin añadir información sensible,", "únicamente datos de prueba"])]
AVISO = ["Vista previa: por ahora no adjuntes", "ni envíes documentación por la", "aplicación; entrégala por los canales", "habituales del despacho."]

BACK = card(
    f'<rect width="{W}" height="17" fill="{NAVY}"/>'
    + img("h-oscuro.png", 7, 4.6, w=34)
    + t(W - 7, 10.2, "ÁREA DE CLIENTE", 1.9, TAN, "bold", "end", .4)
    # datos de acceso
    + f'<rect x="6" y="22" width="{W - 12}" height="29" rx="2" fill="#fff" stroke="#e7dccb" stroke-width=".3"/>'
    + t(10, 27.6, "TUS DATOS DE ACCESO", 1.9, NAVY, "bold", spacing=.45)
    + t(10, 32.6, "USUARIO", 1.7, TAN_DARK, "bold", spacing=.4)
    + t(10.5, 37.4, USER, 3.6, NAVY, "bold")
    + f'<line x1="10" y1="38.6" x2="{W - 10}" y2="38.6" stroke="{NAVY}" stroke-width=".25"/>'
    + t(10, 42.2, "CONTRASEÑA", 1.7, TAN_DARK, "bold", spacing=.4)
    + t(10.5, 46.6, PASSWORD, 3.6, NAVY, "bold")
    + f'<line x1="10" y1="47.8" x2="{W - 10}" y2="47.8" stroke="{NAVY}" stroke-width=".25"/>'
    # pasos
    + "".join(f'<circle cx="10" cy="{57 + i * 6.8}" r="2.5" fill="{NAVY}"/>'
              + t(10, 57.9 + i * 6.8, str(i + 1), 2.6, "#fff", "bold", "middle")
              + t(14.6, 56.6 + i * 6.8, h, 2.5, NAVY, "bold")
              + lines(14.6, 59.7 + i * 6.8, b, 2.05, INK, lh=1.35)
              for i, (h, b) in enumerate(STEPS))
    # aviso
    + f'<rect x="6" y="78.4" width="{W - 12}" height="14" rx="1.8" fill="#fff" stroke="{TAN}" stroke-width=".3"/>'
    + f'<circle cx="10.2" cy="82.6" r="1.6" fill="{TAN}"/>' + t(10.2, 83.45, "!", 2.3, NAVY, "bold", "middle")
    + lines(13.6, 81.8, AVISO, 1.9, NAVY, lh=1.38)
    # contacto
    + f'<line x1="6" y1="94.2" x2="{W - 6}" y2="94.2" stroke="{STRIPE}" stroke-width=".3"/>'
    + t(W / 2, 98.6, f'{PHONE}  ·  {EMAIL}', 2.05, NAVY, "bold", "middle")
    + f'<rect y="{H - 2.2}" width="{W}" height="2.2" fill="{STRIPE}"/>',
    BG)


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" viewBox="0 0 {w} {h}">{body}</svg>'


def sheet(face, guides):
    cells = "".join(f'<svg x="{c * W}" y="{r * H}" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{face}</svg>'
                    for r in range(2) for c in range(4))
    # líneas de corte finas entre octavillas (solo en el anverso)
    cuts = "".join(f'<line x1="{c * W}" y1="0" x2="{c * W}" y2="210" stroke="#9c7a4c" stroke-width=".15" stroke-dasharray="1 1"/>' for c in range(1, 4))
    cuts += '<line x1="0" y1="105" x2="297" y2="105" stroke="#9c7a4c" stroke-width=".15" stroke-dasharray="1 1"/>'
    return svg(297, 210, cells + (cuts if guides else ""))


def pdf(pages, name):
    writer = PdfWriter()
    for i, page in enumerate(pages):
        tmp = OUT / f".tmp{i}.pdf"
        cairosvg.svg2pdf(bytestring=page.encode(), write_to=str(tmp))
        writer.add_page(PdfReader(tmp).pages[0]); tmp.unlink()
    with open(OUT / name, "wb") as f: writer.write(f)


# El reverso de cada octavilla cae detrás de su anverso al dar la vuelta por el borde corto:
# todas son iguales, así que basta con repetir la misma cara en las 8 posiciones.
pdf([sheet(FRONT, True), sheet(BACK, False)], "octavilla-8xA4.pdf")
pdf([svg(W, H, FRONT), svg(W, H, BACK)], "octavilla-8-unidad.pdf")
for name, face in [("anverso", FRONT), ("reverso", BACK)]:
    cairosvg.svg2png(bytestring=svg(W, H, face).encode(), write_to=str(OUT / f"octavilla-8-{name}.png"), output_width=900)
cairosvg.svg2png(bytestring=sheet(FRONT, True).encode(), write_to=str(OUT / "octavilla-8xA4-anverso.png"), output_width=1600)
cairosvg.svg2png(bytestring=sheet(BACK, False).encode(), write_to=str(OUT / "octavilla-8xA4-reverso.png"), output_width=1600)
print("ok")
