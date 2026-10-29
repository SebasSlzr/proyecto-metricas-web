# Automatización de métricas web (Cypress + Lighthouse)

Proyecto de Énfasis Profesional. Construimos una solución reutilizable que mide automáticamente el rendimiento de tres páginas de la Universidad Autónoma de Manizales con **Lighthouse**, usando **Cypress** para organizar las pruebas. Los resultados se guardan en JSON (con historial), se clasifican en un informe web y se reflejan en **Google Sheets** cada vez que corre un job.

- Repositorio: https://github.com/SebasSlzr/proyecto-metricas-web
- Reporte en Google Sheets: <ENLACE DE LA HOJA>

## Integrantes y páginas evaluadas

| Integrante | Página | URL | Parte principal |
|---|---|---|---|
| Sebastian Salazar | Noticias | https://www.autonoma.edu.co/conoce-la-uam/noticias | Base del proyecto: Cypress + Lighthouse |
| Daniel Cuartas | Desarrollo humano y bienestar | https://www.autonoma.edu.co/desarrollo-humano-y-bienestar | Informe web y clasificación |
| Andres Castrillon | Aspirantes | https://www.autonoma.edu.co/aspirantes | Scheduler (jobs programados) |

## Cómo funciona

```
config/schedule.js ──► scripts/tick.js ──► scripts/run-job.js ──► Cypress (lighthouse.cy.js)
 (jobs y horarios)    (¿qué job toca?)     (lanza cada dispositivo)        │ cy.task('auditar')
                                                                          ▼
                                                  scripts/auditar.js (API de Lighthouse + Chrome)
                                                                          │
                              ┌───────────────────────────────────────────┤
                              ▼                                           ▼
                     data/metrics.json (historial)              scripts/sync-sheets.js ──► Google Sheets
                              │
                              ▼
                  report/ (informe web con clasificación)
```

En pocas palabras: los **jobs** dicen qué medir y cuándo; `tick.js` revisa si a alguno le toca; `run-job.js` lanza Cypress por cada dispositivo; Cypress llama a Lighthouse; el resultado se agrega a `data/metrics.json`, se envía a Google Sheets y el informe web lo muestra clasificado.

## Estructura

```
.github/workflows/auditorias.yml   Scheduler en GitHub Actions
config/pages.js                    Páginas a evaluar
config/devices.js                  Perfiles de dispositivo (móvil y escritorio)
config/thresholds.json             Umbrales de clasificación (único lugar)
config/schedule.js                 Jobs programados
cypress/e2e/lighthouse.cy.js       Pruebas Cypress
scripts/auditar.js                 Medición con Lighthouse y normalización
scripts/run-job.js                 Ejecuta un job (Cypress por dispositivo)
scripts/tick.js                    Decide qué jobs tocan (zona America/Bogota)
scripts/scheduler.js               Scheduler local con node-cron
scripts/sync-sheets.js             Envío de resultados a Google Sheets
data/metrics.json                  Resultados + historial
data/runs.json                     Última ejecución de cada job (se genera solo)
report/                            Informe web
docs/                              Scheduler, análisis y evidencias
```

## Requisitos

- Node.js 20 o superior (probado con 22 y 24)
- Google Chrome instalado

## Instalación

```bash
git clone https://github.com/SebasSlzr/proyecto-metricas-web.git
cd proyecto-metricas-web
npm install
```

## Configuración

- **Páginas:** `config/pages.js` (agregar una página = agregar un bloque).
- **Dispositivos:** `config/devices.js` (viewport, emulación y throttling).
- **Umbrales:** `config/thresholds.json` (Bueno / Por mejorar / Deficiente, configurables).
- **Jobs:** `config/schedule.js` (estado, fecha de inicio, hora, zona `America/Bogota`, frecuencia, dispositivos y páginas).
- **Google Sheets:** crear `.env` en la raíz (no se sube al repo):
  ```
  SHEETS_WEBHOOK_URL=<URL de la aplicación web de Apps Script>
  SHEETS_TOKEN=<token>
  ```
  En GitHub se configuran como *secrets* con los mismos nombres.

## Ejecución

| Comando | Qué hace |
|---|---|
| `npm run audit:movil` | Audita todas las páginas en móvil |
| `npm run audit:escritorio` | Audita todas las páginas en escritorio |
| `npm run tick -- --check` | Muestra qué jobs tocan ahora (no ejecuta nada) |
| `npm run tick -- movil-diario` | Fuerza un job por su id, sin esperar la hora |
| `npm run scheduler` | Scheduler local con node-cron (dejar la terminal abierta) |
| `npm run report` | Abre el informe en http://localhost:8080/report/ |

Detalles del scheduler (local y GitHub Actions): [docs/scheduler.md](docs/scheduler.md).

## Formato de los datos

Cada medición se **agrega** a `data/metrics.json` (así se conserva el historial). Los tiempos se guardan en milisegundos y solo se convierten a segundos en el informe:

```json
{
  "url": "https://www.autonoma.edu.co/aspirantes",
  "pagina": "Aspirantes",
  "responsable": "Andres Castrillon",
  "device": "mobile",
  "screenEmulation": "Moto G (412x823)",
  "job": "movil-diario",
  "timestamp": "2026-10-28T14:39:51.233Z",
  "firstContentfulPaint": 2583,
  "largestContentfulPaint": 3100,
  "speedIndex": 6307,
  "performance": 56,
  "status": "ok",
  "error": null
}
```

Si una medición falla, se registra con `"status": "error"` y el motivo en `error`.

## Clasificación (configurable en `config/thresholds.json`)

| Métrica | ✅ Bueno | ⚠️ Por mejorar | ❌ Deficiente |
|---|---|---|---|
| FCP | ≤ 1,8 s | > 1,8 – 3 s | > 3 s |
| LCP | ≤ 2,5 s | > 2,5 – 4 s | > 4 s |
| Speed Index | ≤ 3,4 s | > 3,4 – 5,8 s | > 5,8 s |
| Performance | 90 – 100 | 50 – 89 | 0 – 49 |

## Scheduler

Configuramos dos jobs independientes: `movil-diario` (06:00) y `escritorio-diario` (06:30), hora de Bogotá. Se pueden ejecutar de dos formas:

- **Local:** `npm run scheduler` revisa cada minuto con node-cron.
- **GitHub Actions:** el workflow revisa cada 15 minutos en los servidores de GitHub, así no depende de que un computador esté encendido. Al terminar, guarda los resultados en el repositorio con un commit automático.

`tick.js` calcula la hora de Bogotá por su cuenta, por eso no importa que el cron de GitHub use UTC. Como las revisiones pueden llegar tarde, un job todavía se ejecuta dentro de una ventana de 180 minutos (`toleranciaMinutos`), y `data/runs.json` evita que corra dos veces el mismo día.

## Google Sheets

Cada ejecución envía los resultados a un Apps Script publicado como aplicación web:
- Pestaña **Historial**: agrega las filas nuevas de cada ejecución.
- Pestaña **Actual**: se reescribe con la última medición de cada página y dispositivo.
- Las clasificaciones se muestran con texto, ícono y color (formato condicional en la hoja).

## Decisión técnica: API de Lighthouse en lugar de `cypress-audit`

Al principio probamos el plugin `cypress-audit`, que audita dentro del Chrome que controla Cypress. Con Cypress 16 y Chrome 156 cerraba la pestaña de pruebas y abortaba la ejecución. Por eso decidimos que Cypress organice y ejecute las pruebas, y que una **tarea de Cypress** (`cy.task('auditar')`) llame a la API oficial de Lighthouse en Node con su propio Chrome. Así Lighthouse queda integrado con Cypress sin que se estorben.

## Agregar páginas, dispositivos o jobs

Solo se edita la configuración correspondiente (`config/pages.js`, `config/devices.js` o `config/schedule.js`); la lógica principal no cambia.

## Resultados y evidencias

- Análisis (mejor y peor rendimiento, diferencias entre dispositivos y recomendaciones): [docs/analisis.md](docs/analisis.md)
- Evidencias de ejecución: carpeta [docs/evidencias](docs/evidencias)

## Limitaciones

- Las mediciones de Lighthouse varían entre ejecuciones (red, carga del servidor, equipo). Por eso conservamos el historial y comparamos condiciones equivalentes.
- El cron de GitHub Actions es "de mejor esfuerzo": en repositorios con poca actividad puede retrasarse más de lo programado. La ventana de tolerancia cubre retrasos normales; para horarios exactos se puede usar el scheduler local.
