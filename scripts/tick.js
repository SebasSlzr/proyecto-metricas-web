const fs = require('fs');
const path = require('path');
const schedule = require('../config/schedule');
const { ejecutarJob } = require('./run-job');

const RUTA_RUNS = path.join(__dirname, '..', 'data', 'runs.json'); // última fecha de ejecución por job

function leerRuns() {
  try { return JSON.parse(fs.readFileSync(RUTA_RUNS, 'utf8')); } catch { return {}; }
}
function guardarRuns(runs) {
  fs.mkdirSync(path.dirname(RUTA_RUNS), { recursive: true });
  fs.writeFileSync(RUTA_RUNS, JSON.stringify(runs, null, 2));
}

// Fecha y hora actuales en la zona horaria configurada (sin depender de la hora del servidor)
function ahoraEn(zona, fecha = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    }).formatToParts(fecha).map((x) => [x.type, x.value])
  );
  const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    hora: `${p.hour}:${p.minute}`,
    minutos: Number(p.hour) * 60 + Number(p.minute),
    diaSemana: dias[p.weekday],
  };
}

function estaPendiente(job, ahora, runs) {
  if (!job.habilitado) return false;
  if (ahora.fecha < job.fechaInicio) return false;

  const [h, m] = job.hora.split(':').map(Number);
  const programado = h * 60 + m;
  if (ahora.minutos < programado) return false;                                   // aún no es la hora
  if (ahora.minutos > programado + (schedule.toleranciaMinutos ?? 180)) return false; // ya pasó la ventana

  const ultima = runs[job.id];
  if (job.frecuencia === 'unica') return ahora.fecha === job.fechaInicio && !ultima;
  if (ultima === ahora.fecha) return false;                                        // ya corrió hoy
  if (job.frecuencia === 'semanal') return ahora.diaSemana === job.diaSemana;
  return job.frecuencia === 'diaria';
}

async function ejecutarPendientes() {
  const ahora = ahoraEn(schedule.timezone);
  const runs = leerRuns();
  const pendientes = schedule.jobs.filter((j) => estaPendiente(j, ahora, runs));
  for (const job of pendientes) {
    runs[job.id] = ahora.fecha; // se marca ANTES de ejecutar para no repetirlo en bucle si algo falla
    guardarRuns(runs);
    await ejecutarJob(job);
  }
  return pendientes.map((j) => j.id);
}

async function main() {
  const arg = process.argv[2];
  const ahora = ahoraEn(schedule.timezone);

  if (arg === '--check') { // solo informa (lo usa GitHub Actions para no instalar nada si no hay trabajo)
    const ids = schedule.jobs.filter((j) => estaPendiente(j, ahora, leerRuns())).map((j) => j.id);
    console.log(`Ahora (${schedule.timezone}): ${ahora.fecha} ${ahora.hora} → pendientes: ${ids.join(', ') || 'ninguno'}`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `pendientes=${ids.length > 0}\n`);
    return;
  }
  if (arg) { // forzar un job por su id, ignorando el horario
    const job = schedule.jobs.find((j) => j.id === arg);
    if (!job) {
      console.error(`No existe el job "${arg}". Disponibles: ${schedule.jobs.map((j) => j.id).join(', ')}`);
      process.exit(1);
    }
    await ejecutarJob(job);
    return;
  }
  const ids = await ejecutarPendientes();
  console.log(ids.length ? `Jobs ejecutados: ${ids.join(', ')}` : `Sin jobs pendientes (${ahora.fecha} ${ahora.hora}).`);
}

if (require.main === module) main();

module.exports = { ahoraEn, estaPendiente, ejecutarPendientes };