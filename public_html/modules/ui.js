import { state, TELEMETRY_LIMIT } from './state.js';
import { els } from './dom.js';

export function recordEvent(type, detail) {
  state.sessionEvents.push({ at: new Date().toISOString(), type, detail });
  if (state.sessionEvents.length > 200) state.sessionEvents.shift();
}

export function log(label, value) {
  state.telemetry = [[label, value], ...state.telemetry].slice(0, TELEMETRY_LIMIT);
  els.telemetry.innerHTML = state.telemetry.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join('');
  recordEvent(label, value);
}

export function setBadge(text, live) {
  els.badge.textContent = text;
  els.badge.classList.toggle('status-live', !!live);
  els.badge.classList.toggle('status-idle', !live);
}

export function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function updateBar(el, value) {
  el.style.width = `${clamp(value)}%`;
}

export function setSensorStatus(key, status, label) {
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

export function updateModeButtons() {
  els.modes.forEach(button => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  els.modeLabel.textContent = `MODE: ${state.mode.toUpperCase()}`;
}

export function updateCameraUI() {
  const visual = state.mode === 'visual';
  els.close.classList.toggle('hidden', !visual);
  els.video.classList.toggle('is-visible', visual && !!state.cameraStream);
  els.target.classList.toggle('hidden', !visual);
}

export function updatePowerButton() {
  els.power.textContent = `Low Power: ${state.lowPower ? 'On' : 'Off'}`;
  document.body.classList.toggle('low-power', state.lowPower);
}

export function updateDiagnosticsUI() {
  els.diagnostics.classList.toggle('is-collapsed', state.diagnosticsCollapsed);
  els.toggleTelemetry.textContent = state.diagnosticsCollapsed ? 'Show Diagnostics' : 'Hide Diagnostics';
}

export function updateCanvasSize() {
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

export function renderReadings() {
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

  updateBar(els.emfBar, emf);
  updateBar(els.audioBar, audio);
  updateBar(els.touchBar, touch);
  updateBar(els.rfBar, rf);
  updateBar(els.batteryBar, battery);
  updateBar(els.tempBar, temp);
}

export function renderWords() {
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
