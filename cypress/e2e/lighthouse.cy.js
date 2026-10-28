const paginas = require('../../config/pages');
const dispositivos = require('../../config/devices');

const dispositivo = dispositivos[Cypress.expose('device') || 'mobile'];
const job = Cypress.expose('job') || 'manual';
const filtro = Cypress.expose('pages'); // ej: "noticias+bienestar" (opcional)
const seleccionadas = filtro
  ? paginas.filter((p) => String(filtro).split('+').includes(p.id))
  : paginas;

describe(`Lighthouse · ${dispositivo.etiqueta}`, () => {
  seleccionadas.forEach((pagina) => {
    it(`${pagina.nombre} (${dispositivo.id})`, () => {
      cy.task('auditar', { paginaId: pagina.id, deviceId: dispositivo.id, job }, { timeout: 300000 })
        .then((registro) => {
          cy.log(`FCP ${registro.firstContentfulPaint} ms · LCP ${registro.largestContentfulPaint} ms · Performance ${registro.performance}`);
          expect(registro.status, registro.error || 'auditoría').to.eq('ok');
        });
    });
  });
});