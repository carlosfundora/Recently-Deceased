const $ = id => document.getElementById(id);

export const els = {
  engage: $('engageBtn'),
  recal: $('recalibrateBtn'),
  close: $('closeVisualBtn'),
  settings: $('settingsBtn'),
  power: $('powerModeBtn'),
  exportBtn: $('exportBtn'),
  permission: $('permissionStatus'),
  badge: $('systemBadge'),
  canvas: $('meterCanvas'),
  video: $('cameraFeed'),
  flash: $('flashOverlay'),
  target: $('visualTarget'),
  camHud: $('cameraHud'),
  modeLabel: $('modeLabel'),
  spirit: $('spiritBox'),
  telemetry: $('telemetryLog'),
  drain: $('drainRateValue'),
  emf: $('emfValue'),
  emfBar: $('emfBar'),
  audio: $('audioValue'),
  audioBar: $('audioBar'),
  touch: $('touchValue'),
  touchBar: $('touchBar'),
  rf: $('rfValue'),
  rfBar: $('rfBar'),
  battery: $('batteryValue'),
  batteryBar: $('batteryBar'),
  temp: $('tempValue'),
  tempBar: $('tempBar'),
  orientation: $('orientationValue'),
  gps: $('gpsValue'),
  humidity: $('humidityValue'),
  light: $('lightValue'),
  snap: $('snapBtn'),
  sensorChips: $('sensorChips'),
  toggleTelemetry: $('toggleTelemetryBtn'),
  diagnostics: $('diagnosticsPanel'),
  viewport: $('viewportPanel'),
  modes: [...document.querySelectorAll('.mode-button')],
};

export const ctx = els.canvas.getContext('2d');
export const lightCanvas = document.createElement('canvas');
lightCanvas.width = 32;
lightCanvas.height = 32;
export const lightCtx = lightCanvas.getContext('2d', { willReadFrequently: true });
