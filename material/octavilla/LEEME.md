# Octavilla de acceso al área de cliente (ProPymes)

- `octavilla-propymes-A5.pdf`: octavilla A5 (148 × 210 mm), una por hoja.
- `octavilla-propymes-2xA4.pdf`: dos octavillas en un A4 apaisado, para imprimir y cortar.
- `octavilla-propymes.png`: vista previa.

QR a https://app.propymesasesores.es, usuario `Cliente`, contraseña `prueba` y aviso de vista previa.
`make.py` genera las tres propuestas (A marino, B crema —la elegida—, C recortable):
`pip install qrcode cairosvg pypdf pillow && python3 make.py`.

## Octavilla 1/8 de A4 (74,25 × 105 mm), anverso y reverso — `make8.py`

- `octavilla-8xA4.pdf`: página 1 = 8 anversos, página 2 = 8 reversos. Imprimir a doble cara,
  "dar la vuelta por el borde corto", al 100 % (tamaño real) y cortar por las líneas.
- `octavilla-8-unidad.pdf`: una octavilla a tamaño real (anverso y reverso), para imprenta.
