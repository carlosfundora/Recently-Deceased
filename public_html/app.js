import { SENSOR_KEYS, state } from './modules/state.js';
import { PROFILES, PRESETS, THRESHOLDS } from './modules/config.js';
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
  updateSelections,
  updateInstallPromptVisibility,
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
function detachResizeObserver() { if (!state.resizeObserver) return; state.resizeObserver.disconnect(); state.resizeObserver = null; }
function stopLoop() { cancelAnimationFrame(state.raf); state.raf = 0; }
function updateAnomaly() {
  const motion = Math.min(100, (Math.abs(state.s.x) + Math.abs(state.s.y) + Math.abs(state.s.z)) * 3.4);
  const audio = Math.min(100, (state.s.audio / 255) * 100);
  const rf = Math.min(100, state.s.rfAvg * 1.2 * (PRESETS[state.preset]?.rfMultiplier || 1));
  const light = Math.min(100, Math.abs(state.s.lightDelta || 0) * 8);
  const score = Math.min(100, ((motion * 0.3) + (audio * 0.28) + (rf * 0.28) + (light * 0.14)) * (PRESETS[state.preset]?.anomalyBias || 1));
  state.anomaly.score = score;
  state.anomaly.locked = score >= THRESHOLDS.anomalyLock;
  state.anomaly.label = score >= THRESHOLDS.anomalyLock ? 'Locked' : score >= THRESHOLDS.anomalyWarn ? 'Warning' : 'Idle';
}
function startLoop() {
  const tick = () => {
    if (!state.live || state.hiddenPaused) return;
    state.frame += 1;
    sampleAudio();
    updateEnvironment();
    sampleLight();
    updateAnomaly();
    drawCanvas();
    renderReadings();
    state.raf = window.requestAnimationFrame(tick);
  };
  stopLoop();
  state.raf = window.requestAnimationFrame(tick);
}
function stopWordTimer() { clearInterval(state.wordTimer); state.wordTimer = 0; }
function startWordTimer() { stopWordTimer(); const base = PROFILES[state.profile]?.spiritInterval || 700; const slow = state.lowPower ? 1.7 : 1; state.wordTimer = setInterval(maybeSpawnWord, Math.round(base * slow)); }
async function syncVisualState() { updateModeButtons(); updateCameraUI(); if (state.mode === 'visual') await startCamera(); else stopCamera(); updateCameraUI(); }
async function setMode(mode) { state.mode = mode; await syncVisualState(); log('Mode', mode.toUpperCase()); }
function handleVisibilityChange() {
  if (!state.live) return;
  if (document.hidden) {
    state.hiddenPaused = true; stopLoop(); stopCamera(); if (state.audioCtx?.state === 'running') state.audioCtx.suspend().catch(() => {}); log('System', 'Background pause');
  } else {
    state.hiddenPaused = false; if (state.audioCtx?.state === 'suspended') state.audioCtx.resume().catch(() => {}); syncVisualState(); startLoop(); log('System', 'Foreground resume');
  }
}
async function engage() {
  els.permission.innerHTML = 'Requesting permissions and calibrating mobile sensors...';
  setBadge('Calibrating', true); stopAll(); attachResizeObserver();
  const motionGranted = await requestMotionPermission(); const audioGranted = await startAudio();
  attachSensors(); attachGeolocation(); attachBattery();
  setSensorStatus('motion', motionGranted ? 'ok' : 'warn', motionGranted ? 'Motion: live' : 'Motion: blocked');
  setSensorStatus('touch', 'warn', 'Touch: proxy');
  state.live = true; await syncVisualState(); startLoop(); startWordTimer(); renderWords(); renderReadings();
  els.permission.innerHTML = `System active: ${audioGranted ? 'microphone online' : 'microphone unavailable'}, ${motionGranted ? 'motion online' : 'motion unavailable'}, location optional.`;
  setBadge('Live', true); log('System', 'Field meter engaged');
}
function recalibrate() {
  state.words = []; state.rf = []; Object.assign(state.s,{x:0,y:0,z:0,mag:0,audio:0,drain:0,temp:22.5,pressure:1013,humidity:65,rfNoise:0,rfAvg:0,light:null,lightDelta:0,touch:0});
  Object.assign(state.peaks,{emf:0,audio:0,touch:0,rf:0,battery:null}); state.anomaly={score:0,locked:false,label:'Idle'};
  renderWords(); renderReadings(); log('System', 'Manual recalibration complete');
}
function setLowPower(next) { state.lowPower = next; updatePowerButton(); if (state.live) startWordTimer(); log('Power', next ? 'Low power enabled' : 'Low power disabled'); }
function toggleDiagnostics() { state.diagnosticsCollapsed = !state.diagnosticsCollapsed; updateDiagnosticsUI(); }
function exportSession() {
  const payload = { exportedAt:new Date().toISOString(), mode:state.mode, profile:state.profile, preset:state.preset, lowPower:state.lowPower, telemetry:state.telemetry, sessionEvents:state.sessionEvents, sensors:state.s, anomaly:state.anomaly, peaks:state.peaks };
  let blob; let ext = state.exportFormat;
  if (state.exportFormat === 'csv') {
    const rows = ['time,type,detail', ...state.sessionEvents.map(item => `${JSON.stringify(item.at)},${JSON.stringify(item.type)},${JSON.stringify(item.detail)}`)];
    blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  } else if (state.exportFormat === 'txt') {
    const lines = [
      `Ghost Meter Session Report`,
      `Exported: ${payload.exportedAt}`,
      `Mode: ${payload.mode}`,
      `Profile: ${payload.profile}`,
      `Preset: ${payload.preset}`,
      `Anomaly: ${payload.anomaly.label} (${Math.round(payload.anomaly.score)}%)`,
      '',
      'Timeline:',
      ...payload.sessionEvents.slice(-20).map(item => `- ${item.at} | ${item.type}: ${item.detail}`),
    ];
    blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  } else {
    blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    ext = 'json';
  }
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `ghost-meter-session-${Date.now()}.${ext}`; link.click(); URL.revokeObjectURL(url); log('Export', `Session exported (${ext.toUpperCase()})`);
}
function applyProfile(value) { state.profile = value; const profile = PROFILES[value]; if (profile) state.lowPower = profile.lowPowerDefault; updateSelections(); updatePowerButton(); if (state.live) startWordTimer(); log('Profile', profile?.label || value); }
function applyPreset(value) { state.preset = value; state.theme = PRESETS[value]?.theme || state.theme; updateSelections(); log('Preset', PRESETS[value]?.label || value); }
async function installPwa() { if (!state.deferredInstallPrompt) return; const prompt = state.deferredInstallPrompt; prompt.prompt(); await prompt.userChoice.catch(() => {}); state.deferredInstallPrompt = null; updateInstallPromptVisibility(); }
function stopAll() {
  state.live = false; state.hiddenPaused = false; stopLoop(); stopWordTimer();
  if (state.audioStream) { state.audioStream.getTracks().forEach(track => track.stop()); state.audioStream = null; }
  if (state.audioCtx) { state.audioCtx.close().catch(() => {}); state.audioCtx = null; }
  state.analyser = null; state.data = null; detachGeolocation(); detachBattery(); detachSensors(); stopCamera(); detachResizeObserver(); setBadge('Idle', false);
}
function initKeyboardTabs() { els.modes.forEach((button,index)=>{ button.addEventListener('keydown', async event => { if (!['ArrowLeft','ArrowRight'].includes(event.key)) return; event.preventDefault(); const nextIndex = event.key==='ArrowRight' ? (index+1)%els.modes.length : (index-1+els.modes.length)%els.modes.length; els.modes[nextIndex].focus(); await setMode(els.modes[nextIndex].dataset.mode); }); }); }
function initSensorChips() { SENSOR_KEYS.forEach(key => { const label = key==='touch' ? 'Touch: proxy' : `${key[0].toUpperCase()}${key.slice(1)}: idle`; const status = key==='touch' ? 'warn' : 'idle'; setSensorStatus(key,status,label); }); }
function registerPwa() {
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); state.deferredInstallPrompt = event; updateInstallPromptVisibility(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
function init() {
  attachResizeObserver(); registerPwa();
  els.engage.addEventListener('click', engage); els.recal.addEventListener('click', recalibrate); els.close.addEventListener('click', () => state.mode === 'visual' && setMode('dashboard')); els.settings.addEventListener('click', toggleDiagnostics); els.install?.addEventListener('click', installPwa);
  els.power.addEventListener('click', () => setLowPower(!state.lowPower)); els.exportBtn.addEventListener('click', exportSession); els.profileSelect.addEventListener('change', e => applyProfile(e.target.value)); els.presetSelect.addEventListener('change', e => applyPreset(e.target.value)); els.exportFormatSelect.addEventListener('change', e => { state.exportFormat = e.target.value; updateSelections(); });
  els.snap.addEventListener('click', () => { els.flash.classList.add('is-flashing'); setTimeout(() => els.flash.classList.remove('is-flashing'), 180); });
  els.toggleTelemetry.addEventListener('click', toggleDiagnostics); els.modes.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  document.addEventListener('visibilitychange', handleVisibilityChange); window.addEventListener('beforeunload', stopAll);
  initKeyboardTabs(); initSensorChips(); updateSelections(); updatePowerButton(); updateDiagnosticsUI(); updateModeButtons(); updateCameraUI(); renderReadings(); renderWords(); log('Sensors', 'Tap Engage System');
}
init();
