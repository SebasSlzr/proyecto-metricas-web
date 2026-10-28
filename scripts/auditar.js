// Mide una URL con Lighthouse y devuelve el registro normalizado.

async function medir(url, dispositivo) {
  // Lighthouse y chrome-launcher son módulos ESM: se cargan con import() dinámico
  const { default: lighthouse } = await import('lighthouse');
  const { launch } = await import('chrome-launcher');

  const chrome = await launch({
    chromeFlags: ['--headless=new', '--disable-gpu', ...(process.env.CI ? ['--no-sandbox'] : [])],
  });
  try {
    const resultado = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance'],
      formFactor: dispositivo.formFactor,
      screenEmulation: dispositivo.screenEmulation,
      throttling: dispositivo.throttling,
    });
    return resultado.lhr;
  } finally {
    try { await chrome.kill(); } catch { /* en Windows a veces falla al borrar temporales; se ignora */ }
  }
}

function identidad(pagina, dispositivo, job) {
  return {
    url: pagina.url,
    pagina: pagina.nombre,
    responsable: pagina.responsable,
    device: dispositivo.id,
    screenEmulation: dispositivo.etiqueta,
    job,
  };
}

// Convierte el reporte crudo de Lighthouse en los campos de la tabla 7
function normalizar(lhr, base) {
  if (lhr.runtimeError) {
    throw new Error(`${lhr.runtimeError.code}: ${lhr.runtimeError.message}`);
  }
  const ms = (id) => {
    const v = lhr.audits[id] && lhr.audits[id].numericValue;
    return v == null ? null : Math.round(v); // milisegundos, como número
  };
  return {
    ...base,
    timestamp: lhr.fetchTime, // ISO 8601
    firstContentfulPaint: ms('first-contentful-paint'),
    largestContentfulPaint: ms('largest-contentful-paint'),
    speedIndex: ms('speed-index'),
    performance: Math.round(lhr.categories.performance.score * 100),
    status: 'ok',
    error: null,
  };
}

function registroError(base, mensaje) {
  return {
    ...base,
    timestamp: new Date().toISOString(),
    firstContentfulPaint: null,
    largestContentfulPaint: null,
    speedIndex: null,
    performance: null,
    status: 'error',
    error: mensaje,
  };
}

module.exports = { medir, identidad, normalizar, registroError };