export const state = {
  live: false,
  calibrated: false,
  mode: 'dashboard',
  lowPower: false,
  compact: false,
  visibilityPaused: false,
  renderRunning: false,
  cameraWanted: false,
  rafId: 0,
  wordTimer: 0,
  touchResetHandle: 0,
  resizeObserver: null,
  session: [],
  telemetry: [
    { label: 'System', value: 'Awaiting calibration' },
    { label: 'Mobile', value: 'Standalone page ready' },
  ],
  statuses: {
    mic: { state: 'idle', label: 'Mic idle' },
    motion: { state: 'idle', label: 'Motion idle' },
    camera: { state: 'idle', label: 'Camera idle' },
    gps: { state: 'idle', label: 'GPS idle' },
    battery: { state: 'idle', label: 'Battery idle' },
    vibration: {
      state: typeof navigator !== 'undefined' && 'vibrate' in navigator ? 'ok' : 'unsupported',
      label: typeof navigator !== 'undefined' && 'vibrate' in navigator ? 'Vibration available' : 'Vibration unsupported',
    },
    touch: { state: 'idle', label: 'Touch idle' },
  },
  rfBuffer: [],
  words: [],
  batteryHistory: Array.from({ length: 20 }, () => 100),
  sensors: {
    x: 0,
    y: 0,
    z: 0,
    mag: 0,
    audio: 0,
    gps: null,
    battery: null,
    drain: 0,
    temp: 22.5,
    pressure: 1013,
    humidity: 65,
    touch: 0,
    rfNoise: 0,
    rfAvg: 0,
    light: null,
    lightDelta: 0,
  },
};

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function setFeatureStatus(key, nextState, label) {
  state.statuses[key] = { state: nextState, label };
}

export function pushTelemetry(label, value) {
  state.telemetry.unshift({ label, value });
  state.telemetry = state.telemetry.slice(0, 8);
}

export function pushSession(type, message, data = {}) {
  state.session.unshift({
    type,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
  state.session = state.session.slice(0, 200);
}

export function resetDynamicState() {
  state.rfBuffer = [];
  state.words = [];
  state.sensors = {
    ...state.sensors,
    x: 0,
    y: 0,
    z: 0,
    mag: 0,
    audio: 0,
    drain: 0,
    temp: 22.5,
    pressure: 1013,
    humidity: 65,
    touch: 0,
    rfNoise: 0,
    rfAvg: 0,
    light: null,
    lightDelta: 0,
  };
}
