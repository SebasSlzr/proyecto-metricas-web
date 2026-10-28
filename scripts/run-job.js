// Ejecuta un job: lanza Cypress una vez por cada dispositivo del job.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RUTA_JSON = path.join(__dirname, '..', 'data', 'metrics.json');

function leerMetricas() {
  try { return JSON.parse(fs.readFileSync(RUTA_JSON, 'utf8')); } catch { return []; }
}

async function ejecutarJob(job) {
  const inicio = new Date().toISOString();
  console.log(`Ejecutando job "${job.id}" (${job.dispositivos.join(', ')})`);

  for (const dispositivo of job.dispositivos) {
    const expose = `device=${dispositivo},job=${job.id},pages=${job.paginas.join('+')}`;
    const r = spawnSync(
      'npx',
      ['cypress', 'run', '--browser', 'chrome', '--spec', 'cypress/e2e/lighthouse.cy.js', '--expose', expose],
      { stdio: 'inherit', shell: true }
    );
    if (r.status !== 0) console.error(`Cypress terminó con código ${r.status} (${dispositivo})`);
  }

  const nuevos = leerMetricas().filter((r) => r.job === job.id && r.timestamp >= inicio);
  console.log(`✔️ Job "${job.id}" terminado: ${nuevos.length} registros nuevos`);

  // Integración opcional con Google Sheets (la agrega otro integrante): scripts/sync-sheets.js
  const rutaSheets = path.join(__dirname, 'sync-sheets.js');
  if (fs.existsSync(rutaSheets)) {
    try { await require(rutaSheets).sincronizar(nuevos); }
    catch (e) { console.error('No se pudo sincronizar con Google Sheets:', e.message); }
  } else {
    console.log('scripts/sync-sheets.js no existe todavía: se omite Google Sheets');
  }
  return nuevos;
}

module.exports = { ejecutarJob };