module.exports = {
  mobile: {
    id: 'mobile',
    etiqueta: 'Moto G (412x823)',
    formFactor: 'mobile',
    viewport: { width: 412, height: 823 },
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    throttling: { rttMs: 150, throughputKbps: 1638.4, requestLatencyMs: 562.5,
                  downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675, cpuSlowdownMultiplier: 4 },
  },
  desktop: {
    id: 'desktop',
    etiqueta: 'Escritorio (1350x940)',
    formFactor: 'desktop',
    viewport: { width: 1350, height: 940 },
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10240, requestLatencyMs: 0,
                  downloadThroughputKbps: 0, uploadThroughputKbps: 0, cpuSlowdownMultiplier: 1 },
  },
};