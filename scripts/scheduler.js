const cron = require('node-cron');
const schedule = require('../config/schedule');
const { ejecutarPendientes } = require('./tick');

let ocupado = false; // evita que dos revisiones se pisen mientras un job está corriendo

cron.schedule('* * * * *', async () => {
  if (ocupado) return;
  ocupado = true;
  try {
    const ids = await ejecutarPendientes();
    if (ids.length) console.log(`[${new Date().toISOString()}] Jobs ejecutados: ${ids.join(', ')}`);
  } catch (e) {
    console.error('Error en el scheduler:', e);
  } finally {
    ocupado = false;
  }
}, { timezone: schedule.timezone });

console.log(`Scheduler activo (zona ${schedule.timezone}). Jobs: ${schedule.jobs.map((j) => j.id).join(', ')}. Ctrl+C para detener.`);