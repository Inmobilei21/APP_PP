# APP PP · ProPymes Asesores

Copia de APP.AM con la imagen corporativa de ProPymes. Para actualizarla con los últimos cambios de APP.AM: `python3 tools/brand-pp.py ../APP.AM .`

## Lector de facturas con IA

El botón "Procesar facturas" lee PDFs, fotos, XML y TXT con la API de Claude y rellena el borrador del Excel. Para activarlo, añade en Railway la variable `ANTHROPIC_API_KEY` (y opcionalmente `ANTHROPIC_MODEL`, por defecto `claude-sonnet-5`). Sin la clave, la app sigue usando el lector anterior (pdf.js + Tesseract).
