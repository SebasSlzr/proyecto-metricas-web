const fs = require('fs');
const path = require('path');
const umbrales = require('../config/thresholds.json');

// En local las credenciales vienen de .env; en GitHub Actions, de los secrets
try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch { /* sin .env */ }

const RUTA_JSON = path.join(__dirname, '..', 'data', 'metrics.json');
const ETIQUETAS = { bueno: '✅ Bueno', mejorar: '⚠️ Por mejorar', deficiente: '❌ Deficiente' };

// Misma regla que el informe web, leyendo los mismos umbrales (config/thresholds.json)
function clasificar(clave, valor) {
  if (valor == null) return '';
  const u = umbrales[clave];
  if (u.direccion === 'mayor-mejor') {
    return valor >= u.limiteBueno ? ETIQUETAS.bueno : valor >= u.limitePorMejorar ? ETIQUETAS.mejorar : ETIQUETAS.deficiente;
  }
  return valor <= u.limiteBueno ? ETIQUETAS.bueno : valor <= u.limitePorMejorar ? ETIQUETAS.mejorar : ETIQUETAS.deficiente;
}

const seg = (ms) => (ms == null ? '' : Math.round(ms / 10) / 100); // 2723 ms → 2.72 s (solo en el reporte)
const fechaBogota = (iso) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Bogota' });

function aFila(r) {
  return [
    fechaBogota(r.timestamp), r.job, r.pagina, r.url, r.device === 'mobile' ? 'Móvil' : 'Escritorio',
    seg(r.firstContentfulPaint), clasificar('firstContentfulPaint', r.firstContentfulPaint),
    seg(r.largestContentfulPaint), clasificar('largestContentfulPaint', r.largestContentfulPaint),
    seg(r.speedIndex), clasificar('speedIndex', r.speedIndex),
    r.performance ?? '', clasificar('performance', r.performance),
    r.status === 'ok' ? '✅ ok' : '❌ error', r.error ?? '',
  ];
}

function ultimos(datos) {
  const mapa = new Map();
  [...datos].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).forEach((r) => mapa.set(`${r.url}|${r.device}`, r));
  return [...mapa.values()];
}

async function sincronizar(nuevos) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  const token = process.env.SHEETS_TOKEN;
  if (!url || !token) {
    console.log('ℹ Google Sheets: faltan SHEETS_WEBHOOK_URL o SHEETS_TOKEN; se omite');
    return;
  }
  const todos = JSON.parse(fs.readFileSync(RUTA_JSON, 'utf8'));
  const cuerpo = { token, historial: nuevos.map(aFila), actual: ultimos(todos).map(aFila) };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(cuerpo),
    redirect: 'follow',
  });
  const respuesta = await res.text();
  if (!res.ok || !respuesta.startsWith('ok')) {
    throw new Error(`Respuesta inesperada de Sheets: ${res.status} ${respuesta.slice(0, 120)}`);
  }
  console.log(`✔ Google Sheets actualizado (${cuerpo.historial.length} filas nuevas en Historial, ${cuerpo.actual.length} en Actual)`);
}

// Uso manual: "node scripts/sync-sheets.js" sube TODO el historial (carga inicial, hazlo una sola vez)
if (require.main === module) {
  sincronizar(JSON.parse(fs.readFileSync(RUTA_JSON, 'utf8'))).catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { sincronizar };