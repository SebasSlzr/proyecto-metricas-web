let UMBRALES = {};
let DATOS = [];

const METRICAS = [
  ['firstContentfulPaint', 'FCP'],
  ['largestContentfulPaint', 'LCP'],
  ['speedIndex', 'Speed Index'],
  ['performance', 'Performance'],
];
const ETIQUETAS = {
  bueno:      { texto: 'Bueno',       icono: '✅',  clase: 'bueno' },
  mejorar:    { texto: 'Por mejorar', icono: '⚠️', clase: 'mejorar' },
  deficiente: { texto: 'Deficiente',  icono: '❌',  clase: 'deficiente' },
};

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const seg = (ms) => (ms / 1000).toFixed(2) + ' s'; // los tiempos se convierten a segundos SOLO aquí
const fecha = (iso) => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
const dispositivo = (d) => (d === 'mobile' ? '📱 Móvil' : '🖥️ Escritorio');

function clasificar(umbral, valor) {
  if (umbral.direccion === 'mayor-mejor') {
    if (valor >= umbral.limiteBueno) return ETIQUETAS.bueno;
    if (valor >= umbral.limitePorMejorar) return ETIQUETAS.mejorar;
    return ETIQUETAS.deficiente;
  }
  if (valor <= umbral.limiteBueno) return ETIQUETAS.bueno;
  if (valor <= umbral.limitePorMejorar) return ETIQUETAS.mejorar;
  return ETIQUETAS.deficiente;
}

function celda(clave, valor) {
  if (valor == null) return '<td>—</td>';
  const e = clasificar(UMBRALES[clave], valor);
  const texto = clave === 'performance' ? valor : seg(valor);
  return `<td>${texto} <span class="etiqueta ${e.clase}">${e.icono} ${e.texto}</span></td>`;
}

// Última medición de cada combinación página + dispositivo
function ultimos(datos) {
  const mapa = new Map();
  [...datos].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).forEach((r) => mapa.set(`${r.url}|${r.device}`, r));
  return [...mapa.values()];
}

const encabezado = () =>
  `<thead><tr><th>Página</th><th>Dispositivo</th><th>Fecha</th>${METRICAS.map(([, n]) => `<th>${n}</th>`).join('')}</tr></thead>`;

function filaRegistro(r) {
  if (r.status !== 'ok') {
    return `<tr><td>${esc(r.pagina)}</td><td>${dispositivo(r.device)}</td><td>${fecha(r.timestamp)}</td><td colspan="4" class="deficiente">❌ Error: ${esc(r.error)}</td></tr>`;
  }
  return `<tr><td><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.pagina)}</a></td><td>${dispositivo(r.device)}</td><td>${fecha(r.timestamp)}</td>${METRICAS.map(([k]) => celda(k, r[k])).join('')}</tr>`;
}

function renderResumen(actuales, datos) {
  const ok = actuales.filter((r) => r.status === 'ok' && r.performance != null);
  const mejor = ok.reduce((a, b) => (b.performance > a.performance ? b : a), ok[0]);
  const peor = ok.reduce((a, b) => (b.performance < a.performance ? b : a), ok[0]);
  const desc = (r) => (r ? `${esc(r.pagina)} · ${dispositivo(r.device)} · ${r.performance} pts` : '—');
  const errores = datos.filter((r) => r.status !== 'ok').length;
  const tarjeta = (t, v) => `<div class="tarjeta"><small>${t}</small><strong>${v}</strong></div>`;
  document.getElementById('resumen').innerHTML =
    tarjeta('🏆 Mejor rendimiento', desc(mejor)) +
    tarjeta('🐢 Peor rendimiento', desc(peor)) +
    tarjeta('Mediciones en el historial', datos.length) +
    tarjeta('Errores registrados', errores);
}

function renderActual(actuales) {
  document.getElementById('tabla-actual').innerHTML = encabezado() + `<tbody>${actuales.map(filaRegistro).join('')}</tbody>`;
}

function renderComparacion(actuales) {
  const porUrl = {};
  actuales.filter((r) => r.status === 'ok').forEach((r) => {
    (porUrl[r.url] ??= { pagina: r.pagina })[r.device] = r;
  });
  const filas = Object.values(porUrl)
    .filter((p) => p.mobile && p.desktop)
    .map((p) => {
      const dif = p.desktop.performance - p.mobile.performance;
      const dLcp = (p.mobile.largestContentfulPaint - p.desktop.largestContentfulPaint) / 1000;
      return `<tr><td>${esc(p.pagina)}</td><td>${p.mobile.performance}</td><td>${p.desktop.performance}</td>` +
        `<td>${dif > 0 ? '+' : ''}${dif} pts en escritorio</td><td>${seg(p.mobile.largestContentfulPaint)}</td>` +
        `<td>${seg(p.desktop.largestContentfulPaint)}</td>` +
        `<td>${Math.abs(dLcp).toFixed(2)} s ${dLcp >= 0 ? 'más lento' : 'más rápido'} en móvil</td></tr>`;
    });
  document.getElementById('tabla-comparacion').innerHTML =
    '<thead><tr><th>Página</th><th>Performance móvil</th><th>Performance escritorio</th><th>Diferencia</th><th>LCP móvil</th><th>LCP escritorio</th><th>Diferencia LCP</th></tr></thead>' +
    `<tbody>${filas.join('') || '<tr><td colspan="7">Aún no hay datos de móvil y escritorio para comparar.</td></tr>'}</tbody>`;
}

function renderErrores(datos) {
  const errores = datos.filter((r) => r.status !== 'ok').sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20);
  document.getElementById('errores').innerHTML = errores.length
    ? errores.map((r) => `<div class="error-item">❌ <strong>${esc(r.pagina)}</strong> · ${dispositivo(r.device)} · ${fecha(r.timestamp)}<br>${esc(r.error)}</div>`).join('')
    : '<p class="leyenda">✅ No hay errores registrados.</p>';
}

function renderHistorial() {
  const pagina = document.getElementById('filtro-pagina').value;
  const dev = document.getElementById('filtro-device').value;
  const filas = DATOS
    .filter((r) => (pagina === 'todas' || r.pagina === pagina) && (dev === 'todos' || r.device === dev))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 100)
    .map(filaRegistro);
  document.getElementById('tabla-historial').innerHTML = encabezado() + `<tbody>${filas.join('')}</tbody>`;
}

function prepararFiltros() {
  const paginas = [...new Set(DATOS.map((r) => r.pagina))];
  document.getElementById('filtro-pagina').innerHTML =
    '<option value="todas">Todas</option>' + paginas.map((p) => `<option>${esc(p)}</option>`).join('');
  document.getElementById('filtro-device').innerHTML =
    '<option value="todos">Todos</option><option value="mobile">Móvil</option><option value="desktop">Escritorio</option>';
  document.getElementById('filtro-pagina').addEventListener('change', renderHistorial);
  document.getElementById('filtro-device').addEventListener('change', renderHistorial);
}

async function iniciar() {
  const t = Date.now(); // evita usar datos en caché
  [DATOS, UMBRALES] = await Promise.all([
    fetch(`../data/metrics.json?t=${t}`).then((r) => r.json()),
    fetch(`../config/thresholds.json?t=${t}`).then((r) => r.json()),
  ]);
  const actuales = ultimos(DATOS);
  const ultima = DATOS.map((r) => r.timestamp).sort().pop();
  document.getElementById('actualizado').textContent = ultima
    ? `Última medición: ${fecha(ultima)} (hora de Bogotá) · ${DATOS.length} mediciones`
    : 'Aún no hay mediciones.';
  renderResumen(actuales, DATOS);
  renderActual(actuales);
  renderComparacion(actuales);
  renderErrores(DATOS);
  prepararFiltros();
  renderHistorial();
}

iniciar().catch((e) => {
  document.getElementById('actualizado').textContent =
    `No se pudieron cargar los datos (${e.message}). Abre el informe con "npm run report", no con doble clic.`;
});