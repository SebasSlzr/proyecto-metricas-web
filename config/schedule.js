module.exports = {
  timezone: 'America/Bogota',  
  toleranciaMinutos: 180,
  jobs: [
    {
      id: 'movil-diario',
      habilitado: true,
      fechaInicio: '2026-10-28',
      hora: '14:45',
      frecuencia: 'diaria',
      diaSemana: null,
      dispositivos: ['mobile'],
      paginas: ['noticias', 'bienestar', 'aspirantes'],
    },
    {
      id: 'escritorio-diario',
      habilitado: true,
      fechaInicio: '2026-10-28',
      hora: '14:52',
      frecuencia: 'diaria',
      diaSemana: null,
      dispositivos: ['desktop'],
      paginas: ['noticias', 'bienestar', 'aspirantes'],
    },
  ],
};