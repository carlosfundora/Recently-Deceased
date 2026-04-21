import { SENSOR_KEYS, state } from './modules/state.js';
import { els } from './modules/dom.js';
import {
  log,
  setBadge,
  setSensorStatus,
  renderReadings,
  renderWords,
  updateModeButtons,
  updateCameraUI,
  updatePowerButton,
  updateDiagnosticsUI,
  updateCanvasSize,
} from './modules/ui.js';
import { updateEnvironment, drawCanvas } from './modules/render.js';
import {
  requestMotionPermission,
  startAudio,
  startCamera,
  stopCamera,
  attachSensors,
  detachSensors,
  attachGeolocation,
  detachGeolocation,
  attachBattery,
  detachBattery,
  sampleAudio,
  sampleLight,
} from './modules/sensors.js';
import { maybeSpawnWord } from './modules/words.js';

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

function stopLoop() {
  cancelAnimationFrame(state.raf);
  state.raf = 0;
}

function startLoop() {
  const tick = () => {
    if (!state.live || state.hiddenPaused) return;
    state.frame += 1;
    sampleAudio();
    updateEnvironment();
    sampleLight();
    drawCanvas();
    renderReadings();
    state.raf = window.requestAnimationFrame(tick);
  };
  stopLoop();
  state.raf = window.requestAnimationFrame(tick);
}

function stopWordTimer() {
  clearInterval(state.wordTimer);
  state.wordTimer = 0;
}

function startWordTimer() {
  stopWordTimer();
  state.wordTimer = setInterval(maybeSpawnWord, state.lowPower ? 900 : 500);
}

async function syncVisualState() {
  updateModeButtons();
  updateCameraUI();
  if (state.mode === 'visual') await startCamera();
  else stopCamera();
  updateCameraUI();
}

async function setMode(mode) {
  state.mode = mode;
  await syncVisualState();
  log('Mode', mode.toUpperCase());
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
    syncVisualState();
    startLoop();
    log('System', 'Foreground resume');
  }
}

async function engage() {
  els.permission.innerHTML = 'Requesting permissions and calibrating mobile sensors...';
  setBadge('Calibrating', true);
  stopAll();
  attachResizeObserver();

  const motionGranted = await requestMotionPermission();
  const audioGranted = await startAudio();

  attachSensors();
  attachGeolocation();
  attachBattery();
  setSensorStatus('motion', motionGranted ? 'ok' : 'warn', motionGranted ? 'Motion: live' : 'Motion: blocked');
  setSensorStatus('touch', 'warn', 'Touch: proxy');

  state.live = true;
  await syncVisualState();
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
  Object.assign(state.s, {
    x: 0,
    y: 0,
    z: 0,
    mag: 0,
    audio: 0,
    drain: 0,
    temp: 22.5,
    pressure: 1013,
    humidity: 65,
    rfNoise: 0,
    rfAvg: 0,
    light: null,
    lightDelta: 0,
    touch: 0,
  });
  renderWords();
  renderReadings();
  log('System', 'Manual recalibration complete');
}

function setLowPower(next) {
  state.lowPower = next;
  updatePowerButton();
  if (state.live) startWordTimer();
  log('Power', next ? 'Low power enabled' : 'Low power disabled');
}

function toggleDiagnostics() {
  state.diagnosticsCollapsed = !state.diagnosticsCollapsed;
  updateDiagnosticsUI();
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
  const link = document.createElement('a');
  link.href = url;
  link.download = `ghost-meter-session-${Date.now()}.json`;
  link.click();
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
  detachResizeObserver();
  setBadge('Idle', false);
}

function initKeyboardTabs() {
  els.modes.forEach((button, index) => {
    button.addEventListener('keydown', async event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === 'ArrowRight'
        ? (index + 1) % els.modes.length
        : (index - 1 + els.modes.length) % els.modes.length;
      els.modes[nextIndex].focus();
      await setMode(els.modes[nextIndex].dataset.mode);
    });
  });
}

function initSensorChips() {
  SENSOR_KEYS.forEach(key => {
    const label = key === 'touch' ? 'Touch: proxy' : `${key[0].toUpperCase()}${key.slice(1)}: idle`;
    const status = key === 'touch' ? 'warn' : 'idle';
    setSensorStatus(key, status, label);
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
  els.snap.addEventListener('click', () => {
    els.flash.classList.add('is-flashing');
    setTimeout(() => els.flash.classList.remove('is-flashing'), 180);
  });
  els.toggleTelemetry.addEventListener('click', toggleDiagnostics);
  els.modes.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', stopAll);

  initKeyboardTabs();
  initSensorChips();
  updatePowerButton();
  updateDiagnosticsUI();
  updateModeButtons();
  updateCameraUI();
  renderReadings();
  renderWords();
  log('Sensors', 'Tap Engage System');
}

init();
