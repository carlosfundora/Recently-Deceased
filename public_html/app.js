const WORDS = ['BELOW','COLD','WAIT','HELP','RUN','LOOK','BURIED','ASH','BONE','DARK','LEAVE','NOW','HERE','LOST','RISE','SEEK','PRAY','WATCH','BEHIND','STONE','NAME','FORGOT','LISTEN','SPEAK','TOUCH','EMPTY','ALONE'];
const SENSOR_KEYS = ['mic','motion','camera','gps','battery','touch'];
const TELEMETRY_LIMIT = 16;
const state = {
  live: false,
  mode: 'dashboard',
  lowPower: false,
  diagnosticsCollapsed: false,
  hiddenPaused: false,
  frame: 0,
  raf: 0,
  wordTimer: 0,
  resizeObserver: null,
  audioCtx: null,
  analyser: null,
  data: null,
  audioStream: null,
  cameraStream: null,
  batteryManager: null,
  batteryListener: null,
  geoWatch: null,
  sensorsAttached: false,
  canvasSize: { width: 900, height: 420, ratio: 1 },
  rf: [],
  words: [],
  sessionEvents: [],
  touchReset: 0,
  telemetry: [
    ['System', 'Awaiting calibration'],
    ['Mobile', 'Standalone page ready'],
  ],
  status: {
    mic: 'idle',
    motion: 'idle',
    camera: 'idle',
    gps: 'idle',
    battery: 'idle',
    touch: 'proxy',
  },
  s: {
    x: 0, y: 0, z: 0, mag: 0, audio: 0, gps: null, battery: null,
    drain: 0, temp: 22.5, pressure: 1013, humidity: 65,
    rfNoise: 0, rfAvg: 0, light: null, lightDelta: 0, touch: 0,
  },
};

const $ = id => document.getElementById(id);
const els = {
  engage: $('engageBtn'), recal: $('recalibrateBtn'), close: $('closeVisualBtn'), settings: $('settingsBtn'),
  power: $('powerModeBtn'), exportBtn: $('exportBtn'), permission: $('permissionStatus'), badge: $('systemBadge'),
  canvas: $('meterCanvas'), video: $('cameraFeed'), flash: $('flashOverlay'), target: $('visualTarget'),
  camHud: $('cameraHud'), modeLabel: $('modeLabel'), spirit: $('spiritBox'), telemetry: $('telemetryLog'),
  drain: $('drainRateValue'), emf: $('emfValue'), emfBar: $('emfBar'), audio: $('audioValue'), audioBar: $('audioBar'),
  touch: $('touchValue'), touchBar: $('touchBar'), rf: $('rfValue'), rfBar: $('rfBar'), battery: $('batteryValue'),
  batteryBar: $('batteryBar'), temp: $('tempValue'), tempBar: $('tempBar'), orientation: $('orientationValue'),
  gps: $('gpsValue'), humidity: $('humidityValue'), light: $('lightValue'), snap: $('snapBtn'), sensorChips: $('sensorChips'),
  toggleTelemetry: $('toggleTelemetryBtn'), diagnostics: $('diagnosticsPanel'), viewport: $('viewportPanel'),
  modes: [...document.querySelectorAll('.mode-button')],
};
const ctx = els.canvas.getContext('2d');
const lightCanvas = document.createElement('canvas');
lightCanvas.width = 32; lightCanvas.height = 32;
const lightCtx = lightCanvas.getContext('2d', { willReadFrequently: true });

const handlers = {
  motion: e => {
    state.s.x = e.accelerationIncludingGravity?.x ?? state.s.x;
    state.s.y = e.accelerationIncludingGravity?.y ?? state.s.y;
    state.s.z = e.accelerationIncludingGravity?.z ?? state.s.z;
  },
  orientation: e => { state.s.mag = e.alpha ?? state.s.mag; },
  touch: e => {
    const t = e.touches[0];
    if (!t) return;
    const force = typeof t.force === 'number' && t.force > 0 ? t.force : Math.min(1, 0.35 + e.touches.length * 0.15);
    setTouchForce(force);
  },
  touchEnd: () => setTouchForce(0),
  visibility: () => handleVisibilityChange(),
  beforeUnload: () => stopAll(),
};

function recordEvent(type, detail) {
  state.sessionEvents.push({ at: new Date().toISOString(), type, detail });
  if (state.sessionEvents.length > 200) state.sessionEvents.shift();
}

function log(label, value) {
  state.telemetry = [[label, value], ...state.telemetry].slice(0, TELEMETRY_LIMIT);
  els.telemetry.innerHTML = state.telemetry.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join('');
  recordEvent(label, value);
}

function setBadge(text, live) {
  els.badge.textContent = text;
  els.badge.classList.toggle('status-live', !!live);
  els.badge.classList.toggle('status-idle', !live);
}

function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }
function bar(el, value) { el.style.width = `${clamp(value)}%`; }

function setSensorStatus(key, status, label) {
  state.status[key] = status;
  const el = els.sensorChips.querySelector(`[data-sensor="${key}"]`);
  if (!el) return;
  el.textContent = label;
  el.className = 'sensor-chip';
  if (status === 'ok') el.classList.add('sensor-chip-ok');
  else if (status === 'warn') el.classList.add('sensor-chip-warn');
  else if (status === 'bad') el.classList.add('sensor-chip-bad');
  else el.classList.add('sensor-chip-idle');
}

function updateCameraControls() {
  const visual = state.mode === 'visual';
  els.close.classList.toggle('hidden', !visual);
  els.video.classList.toggle('is-visible', visual && !!state.cameraStream);
  els.target.classList.toggle('hidden', !visual);
}

function setMode(mode) {
  state.mode = mode;
  els.modes.forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  els.modeLabel.textContent = `MODE: ${mode.toUpperCase()}`;
  updateCameraControls();
  if (mode === 'visual') startCamera(); else stopCamera();
  log('Mode', mode.toUpperCase());
}

function updateCanvasSize() {
  const rect = els.canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(rect.width * ratio));
  const height = Math.max(220, Math.floor(rect.height * ratio));
  if (els.canvas.width !== width || els.canvas.height !== height) {
    els.canvas.width = width;
    els.canvas.height = height;
    state.canvasSize = { width, height, ratio };
  }
}

function attachResizeObserver() {
  if (state.resizeObserver) return;
  state.resizeObserver = new ResizeObserver(() => updateCanvasSize());
  state.resizeObserver.observe(els.viewport);
  updateCanvasSize();
}

function detachResizeObserver() {
  if (!state.resizeObserver) return;
  state.resizeObserver.disconnect();
  state.resizeObserver = null;
}

async function requestMotionPermission() {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const granted = await DeviceMotionEvent.requestPermission();
      return granted === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

async function startAudio() {
  try {
    state.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new AudioCtx();
    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 64;
    state.audioCtx.createMediaStreamSource(state.audioStream).connect(state.analyser);
    state.data = new Uint8Array(state.analyser.frequencyBinCount);
    setSensorStatus('mic', 'ok', 'Mic: live');
    log('Mic', 'Online');
    return true;
  } catch {
    setSensorStatus('mic', 'bad', 'Mic: denied');
    log('Mic', 'Unavailable');
    return false;
  }
}

async function startCamera() {
  if (state.cameraStream || !state.live || state.mode !== 'visual') return;
  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    els.video.srcObject = state.cameraStream;
    setSensorStatus('camera', 'ok', 'Camera: live');
    updateCameraControls();
    log('Camera', 'Online');
  } catch {
    setSensorStatus('camera', 'warn', 'Camera: blocked');
    log('Camera', 'Unavailable');
  }
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  els.video.srcObject = null;
  updateCameraControls();
}

function attachSensors() {
  if (state.sensorsAttached) return;
  window.addEventListener('devicemotion', handlers.motion, { passive: true });
  window.addEventListener('deviceorientation', handlers.orientation, { passive: true });
  window.addEventListener('touchstart', handlers.touch, { passive: true });
  window.addEventListener('touchmove', handlers.touch, { passive: true });
  window.addEventListener('touchend', handlers.touchEnd, { passive: true });
  state.sensorsAttached = true;
}

function detachSensors() {
  if (!state.sensorsAttached) return;
  window.removeEventListener('devicemotion', handlers.motion);
  window.removeEventListener('deviceorientation', handlers.orientation);
  window.removeEventListener('touchstart', handlers.touch);
  window.removeEventListener('touchmove', handlers.touch);
  window.removeEventListener('touchend', handlers.touchEnd);
  state.sensorsAttached = false;
}

function attachGeolocation() {
  if (!navigator.geolocation || state.geoWatch != null) {
    if (!navigator.geolocation) setSensorStatus('gps', 'warn', 'GPS: unsupported');
    return;
  }
  state.geoWatch = navigator.geolocation.watchPosition(
    position => {
      state.s.gps = position.coords.accuracy;
      setSensorStatus('gps', 'ok', 'GPS: live');
    },
    () => {
      setSensorStatus('gps', 'warn', 'GPS: blocked');
      log('GPS', 'Unavailable');
    },
    { enableHighAccuracy: true, maximumAge: 5000 }
  );
}

function detachGeolocation() {
  if (state.geoWatch != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(state.geoWatch);
    state.geoWatch = null;
  }
}

function attachBattery() {
  if (!navigator.getBattery || state.batteryManager) {
    if (!navigator.getBattery) setSensorStatus('battery', 'warn', 'Battery: n/a');
    return;
  }
  navigator.getBattery().then(manager => {
    state.batteryManager = manager;
    const updateBattery = () => { state.s.battery = manager.level * 100; };
    updateBattery();
    state.batteryListener = updateBattery;
    manager.addEventListener('levelchange', updateBattery);
    setSensorStatus('battery', 'ok', 'Battery: live');
    log('Battery', 'Available');
  }).catch(() => {
    setSensorStatus('battery', 'warn', 'Battery: n/a');
    log('Battery', 'Unavailable');
  });
}

function detachBattery() {
  if (state.batteryManager && state.batteryListener) {
    state.batteryManager.removeEventListener('levelchange', state.batteryListener);
  }
  state.batteryManager = null;
  state.batteryListener = null;
}

function setTouchForce(value) {
  state.s.touch = Math.max(0, Math.min(1, value));
  clearTimeout(state.touchReset);
  state.touchReset = setTimeout(() => { state.s.touch = 0; }, 160);
}

function triggerFlash() {
  els.flash.classList.add('is-flashing');
  setTimeout(() => els.flash.classList.remove('is-flashing'), 180);
}

function sampleAudio() {
  if (!state.analyser || !state.data) return;
  state.analyser.getByteFrequencyData(state.data);
  state.s.audio = state.data.reduce((sum, value) => sum + value, 0) / state.data.length;
}

function updateEnvironment() {
  if (state.frame % 50 === 0) {
    const motion = (Math.abs(state.s.x) + Math.abs(state.s.y) + Math.abs(state.s.z)) / 30;
    state.s.temp += (Math.random() - 0.5) * 0.12 - motion * 0.04;
    state.s.pressure += (Math.random() - 0.5) * 0.8;
    state.s.humidity = clamp(state.s.humidity + (Math.random() - 0.5) * 1.2, 0, 100);
  }
  const raw = Math.random() * 100;
  state.rf.push(raw);
  if (state.rf.length > 10) state.rf.shift();
  state.s.rfNoise = raw;
  state.s.rfAvg = state.rf.reduce((sum, value) => sum + value, 0) / state.rf.length;
  if (state.s.battery != null && state.frame % 60 === 0) {
    const stress = (Math.abs(state.s.x) + Math.abs(state.s.y) + Math.abs(state.s.z)) / 20;
    state.s.drain = Math.max(0.01, 0.01 + ((Math.random() - 0.42) * 0.05 * stress)) * 100;
  }
}

function sampleLight() {
  if (state.mode !== 'visual' || !lightCtx || !state.cameraStream || !els.video.videoWidth) return;
  const sampleEvery = state.lowPower ? 20 : 10;
  if (state.frame % sampleEvery !== 0) return;
  try {
    lightCtx.drawImage(els.video, 0, 0, 32, 32);
    const img = lightCtx.getImageData(0, 0, 32, 32);
    let total = 0;
    for (let i = 0; i < img.data.length; i += 4) total += (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
    const level = (total / (32 * 32) / 255) * 100;
    state.s.lightDelta = state.s.light == null ? 0 : level - state.s.light;
    state.s.light = level;
  } catch {}
}

function renderReadings() {
  const motion = Math.abs(state.s.x) + Math.abs(state.s.y) + Math.abs(state.s.z);
  const emf = Math.round(motion * 3.4);
  const audio = (state.s.audio / 255) * 100;
  const touch = state.s.touch * 100;
  const rf = state.s.rfAvg;
  const battery = state.s.battery == null ? 0 : state.s.battery;
  const temp = ((state.s.temp - 10) / 30) * 100;
  els.emf.textContent = `${emf} mG`;
  els.audio.textContent = `${Math.round(audio)} dB`;
  els.touch.textContent = `${Math.round(touch)} %`;
  els.rf.textContent = `${Math.round(state.s.rfAvg * 1.5)} p/s`;
  els.battery.textContent = state.s.battery == null ? 'N/A' : `${Math.round(state.s.battery)}% · ${state.s.drain.toFixed(2)}%/min`;
  els.temp.textContent = `${state.s.temp.toFixed(1)}°C · ${Math.round(state.s.pressure)} hPa`;
  els.orientation.textContent = `${Math.round(state.s.mag || 0)}°`;
  els.gps.textContent = state.s.gps == null ? 'N/A' : `${Math.round(state.s.gps)} m`;
  els.humidity.textContent = `${Math.round(state.s.humidity)}%`;
  els.light.textContent = state.s.light == null ? 'N/A' : `${Math.round(state.s.light)}% (${state.s.lightDelta >= 0 ? '+' : ''}${state.s.lightDelta.toFixed(1)})`;
  els.camHud.textContent = state.s.light == null ? 'LIGHT: --' : `LIGHT: ${Math.round(state.s.light)}%`;
  els.drain.textContent = `Drain: ${state.s.drain.toFixed(2)}%/min`;
  bar(els.emfBar, emf); bar(els.audioBar, audio); bar(els.touchBar, touch); bar(els.rfBar, rf); bar(els.batteryBar, battery); bar(els.tempBar, temp);
}

function drawCanvas() {
  const { width, height, ratio } = state.canvasSize;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(2,5,10,0.92)';
  ctx.fillRect(0, 0, width, height);
  const motion = Math.abs(state.s.x) + Math.abs(state.s.y) + Math.abs(state.s.z);
  const intensity = Math.min(1, (motion / 25) + (state.s.audio / 255) + (state.s.touch * 0.5));
  if (state.mode === 'dashboard') {
    ctx.strokeStyle = intensity > 0.7 ? '#ff5f6d' : intensity > 0.4 ? '#ffd45c' : '#3fda8b';
    ctx.lineWidth = 2 * ratio;
    ctx.beginPath();
    const bins = state.data || new Uint8Array(32);
    const slice = width / bins.length;
    for (let i = 0; i < bins.length; i += 1) {
      const y = (bins[i] / 255) * height;
      const x = i * slice;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (state.mode === 'spectral') {
    ctx.strokeStyle = intensity > 0.65 ? '#ffb020' : '#69c7ff';
    ctx.lineWidth = 2.4 * ratio;
    ctx.beginPath();
    for (let i = 0; i < width; i += 6) {
      const y = (height / 2) + Math.sin((i / 18) + state.frame * 0.06) * (24 * ratio * Math.max(0.25, intensity)) + (Math.random() - 0.5) * (state.s.audio / 8);
      i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
    }
    ctx.stroke();
  } else if (state.mode === 'rf') {
    const bw = Math.max(4 * ratio, width / 48);
    for (let x = 0; x < width; x += bw + 1) {
      const wave = Math.sin(state.frame * 0.08 + x / 40) * 0.5 + 0.5;
      const signal = wave * 0.6 + Math.random() * 0.4;
      const bh = signal * height * 0.85;
      ctx.fillStyle = `hsla(${195 + signal * 110},90%,58%,.88)`;
      ctx.fillRect(x, height - bh, bw, bh);
    }
  } else if (state.mode === 'visual') {
    ctx.strokeStyle = motion < 12 ? 'rgba(119,255,176,.92)' : 'rgba(255,212,92,.92)';
    ctx.lineWidth = 2 * ratio;
    const size = 72 * ratio, cx = width / 2, cy = height / 2, x = cx - size / 2, y = cy - size / 2, c = 18 * ratio;
    ctx.beginPath();
    ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
    ctx.moveTo(x + size - c, y); ctx.lineTo(x + size, y); ctx.lineTo(x + size, y + c);
    ctx.moveTo(x, y + size - c); ctx.lineTo(x, y + size); ctx.lineTo(x + c, y + size);
    ctx.moveTo(x + size - c, y + size); ctx.lineTo(x + size, y + size); ctx.lineTo(x + size, y + size - c);
    ctx.stroke();
  }
}

function renderWords() {
  els.spirit.querySelectorAll('.spirit-word').forEach(node => node.remove());
  const empty = els.spirit.querySelector('.spirit-empty');
  if (!state.words.length) {
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');
  state.words.forEach((word, index) => {
    const div = document.createElement('div');
    div.className = 'spirit-word';
    div.textContent = word.text;
    div.style.transform = `translate(calc(-50% + ${word.x}px), calc(-50% + ${index * 26}px)) scale(${Math.max(0.55, 1 - index * 0.12) * word.i})`;
    div.style.opacity = Math.max(0.15, 1 - index * 0.18);
    div.style.filter = `blur(${index * 1.5}px)`;
    div.style.color = word.i > 1.7 ? '#ffdb85' : '#f3f6fb';
    div.style.textShadow = `0 0 ${8 * word.i}px rgba(255,255,255,.45)`;
    els.spirit.appendChild(div);
  });
}

function maybeSpawnWord() {
  if (!state.live || state.mode === 'visual') return;
  const total = Math.sqrt((state.s.x ** 2) + (state.s.y ** 2) + (state.s.z ** 2));
  const motion = Math.min(Math.abs(total - 9.8) / 5, 1);
  const audio = Math.min(state.s.audio / 100, 1);
  const rf = state.s.rfNoise > 85 ? 1 : 0;
  const probability = 0.02 + (motion * 0.4) + (audio * 0.5) + (rf * 0.3);
  if (probability > 0.8 || Math.random() < probability) {
    const intensity = Math.min(2.4, 0.8 + motion + audio + (state.s.touch * 0.6));
    state.words = [{ text: WORDS[Math.floor(Math.random() * WORDS.length)], x: (Math.random() - 0.5) * 130, i: intensity }, ...state.words].slice(0, 6);
    renderWords();
    if (navigator.vibrate) navigator.vibrate(Math.floor(45 + intensity * 75));
  }
}

function startLoop() {
  const step = () => {
    if (!state.live || state.hiddenPaused) return;
    state.frame += 1;
    sampleAudio();
    updateEnvironment();
    sampleLight();
    drawCanvas();
    renderReadings();
    state.raf = window.requestAnimationFrame(step);
  };
  cancelAnimationFrame(state.raf);
  state.raf = window.requestAnimationFrame(step);
}

function stopLoop() {
  cancelAnimationFrame(state.raf);
  state.raf = 0;
}

function startWordTimer() {
  clearInterval(state.wordTimer);
  const interval = state.lowPower ? 900 : 500;
  state.wordTimer = setInterval(maybeSpawnWord, interval);
}

function stopWordTimer() {
  clearInterval(state.wordTimer);
  state.wordTimer = 0;
}

function handleVisibilityChange() {
  if (!state.live) return;
  if (document.hidden) {
    state.hiddenPaused = true;
    stopLoop();
    stopCamera();
    if (state.audioCtx?.state === 'running') state.audioCtx.suspend().catch(() => {});
    log('System', 'Background pause');
  } else {
    state.hiddenPaused = false;
    if (state.audioCtx?.state === 'suspended') state.audioCtx.resume().catch(() => {});
    if (state.mode === 'visual') startCamera();
    startLoop();
    log('System', 'Foreground resume');
  }
}

async function engage() {
  els.permission.innerHTML = 'Requesting permissions and calibrating mobile sensors...';
  setBadge('Calibrating', true);
  stopAll();
  const motionGranted = await requestMotionPermission();
  const audioGranted = await startAudio();
  attachSensors();
  attachGeolocation();
  attachBattery();
  setSensorStatus('motion', motionGranted ? 'ok' : 'warn', motionGranted ? 'Motion: live' : 'Motion: blocked');
  setSensorStatus('touch', 'warn', 'Touch: proxy');
  state.live = true;
  startLoop();
  startWordTimer();
  renderWords();
  renderReadings();
  els.permission.innerHTML = `System active: ${audioGranted ? 'microphone online' : 'microphone unavailable'}, ${motionGranted ? 'motion online' : 'motion unavailable'}, location optional.`;
  setBadge('Live', true);
  log('System', 'Field meter engaged');
}

function recalibrate() {
  state.words = [];
  state.rf = [];
  Object.assign(state.s, { x: 0, y: 0, z: 0, mag: 0, audio: 0, drain: 0, temp: 22.5, pressure: 1013, humidity: 65, rfNoise: 0, rfAvg: 0, light: null, lightDelta: 0, touch: 0 });
  renderWords();
  renderReadings();
  log('System', 'Manual recalibration complete');
}

function setLowPower(next) {
  state.lowPower = next;
  els.power.textContent = `Low Power: ${next ? 'On' : 'Off'}`;
  document.body.classList.toggle('low-power', next);
  if (state.live) {
    startWordTimer();
  }
  log('Power', next ? 'Low power enabled' : 'Low power disabled');
}

function toggleDiagnostics() {
  state.diagnosticsCollapsed = !state.diagnosticsCollapsed;
  els.diagnostics.classList.toggle('is-collapsed', state.diagnosticsCollapsed);
  els.toggleTelemetry.textContent = state.diagnosticsCollapsed ? 'Show Diagnostics' : 'Hide Diagnostics';
}

function exportSession() {
  const payload = {
    exportedAt: new Date().toISOString(),
    mode: state.mode,
    lowPower: state.lowPower,
    telemetry: state.telemetry,
    sessionEvents: state.sessionEvents,
    sensors: state.s,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ghost-meter-session-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log('Export', 'Session exported');
}

function stopAll() {
  state.live = false;
  state.hiddenPaused = false;
  stopLoop();
  stopWordTimer();
  if (state.audioStream) {
    state.audioStream.getTracks().forEach(track => track.stop());
    state.audioStream = null;
  }
  if (state.audioCtx) {
    state.audioCtx.close().catch(() => {});
    state.audioCtx = null;
  }
  state.analyser = null;
  state.data = null;
  detachGeolocation();
  detachBattery();
  detachSensors();
  stopCamera();
  setBadge('Idle', false);
}

function initKeyboardTabs() {
  els.modes.forEach((button, index) => {
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'ArrowRight' ? (index + 1) % els.modes.length : (index - 1 + els.modes.length) % els.modes.length;
      els.modes[nextIndex].focus();
      setMode(els.modes[nextIndex].dataset.mode);
    });
  });
}

function init() {
  attachResizeObserver();
  els.engage.addEventListener('click', engage);
  els.recal.addEventListener('click', recalibrate);
  els.close.addEventListener('click', () => state.mode === 'visual' && setMode('dashboard'));
  els.settings.addEventListener('click', toggleDiagnostics);
  els.power.addEventListener('click', () => setLowPower(!state.lowPower));
  els.exportBtn.addEventListener('click', exportSession);
  els.snap.addEventListener('click', triggerFlash);
  els.toggleTelemetry.addEventListener('click', toggleDiagnostics);
  els.modes.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  document.addEventListener('visibilitychange', handlers.visibility);
  window.addEventListener('beforeunload', handlers.beforeUnload);
  initKeyboardTabs();
  SENSOR_KEYS.forEach(key => setSensorStatus(key, key === 'touch' ? 'warn' : 'idle', `${key[0].toUpperCase()}${key.slice(1)}: ${key === 'touch' ? 'proxy' : 'idle'}`));
  renderReadings();
  renderWords();
  log('Sensors', 'Tap Engage System');
}

init();