const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');
const paginas = require('./config/pages');
const dispositivos = require('./config/devices');
const { medir, identidad, normalizar, registroError } = require('./scripts/auditar');

const RUTA_JSON = path.join(__dirname, 'data', 'metrics.json');

function leerHistorial() {
  try { return JSON.parse(fs.readFileSync(RUTA_JSON, 'utf8')); } catch { return []; }
}

function guardarRegistro(registro) {
  const historial = leerHistorial();
  historial.push(registro); // agrega, nunca sobrescribe: así queda el historial
  fs.mkdirSync(path.dirname(RUTA_JSON), { recursive: true });
  fs.writeFileSync(RUTA_JSON, JSON.stringify(historial, null, 2));
}

module.exports = defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.js',
    video: false,
    screenshotOnRunFailure: false,
    taskTimeout: 300000, // una auditoría puede tardar más de 1 minuto
    setupNodeEvents(on, config) {
      on('task', {
        async auditar({ paginaId, deviceId, job }) {
          const pagina = paginas.find((p) => p.id === paginaId);
          const dispositivo = dispositivos[deviceId];
          const base = identidad(pagina, dispositivo, job);
          let registro;
          try {
            const lhr = await medir(pagina.url, dispositivo);
            registro = normalizar(lhr, base);
          } catch (e) {
            registro = registroError(base, `AUDITORIA_FALLIDA: ${String(e.message).slice(0, 300)}`);
          }
          guardarRegistro(registro);
          return registro;
        },
      });
      return config;
    },
  },
});