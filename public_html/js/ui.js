import { state, clamp } from './state.js';

const byId = (id) => document.getElementById(id);

export const elements = {
  body: document.body,
  viewportWrap: document.querySelector('.viewport-wrap'),
  engageBtn: byId('engageBtn'),
  recalibrateBtn: byId('recalibrateBtn'),
  closeVisualBtn: byId('closeVisualBtn'),
  permissionStatus: byId('permissionStatus'),
  systemBadge: byId('systemBadge'),
  meterCanvas: byId('meterCanvas'),
  cameraFeed: byId('cameraFeed'),
  flashOverlay: byId('flashOverlay'),
  visualTarget: byId('visualTarget'),
  cameraHud: byId('cameraHud'),
  modeLabel: byId('modeLabel'),
  spiritBox: byId('spiritBox'),
  telemetryLog: byId('telemetryLog'),
  drainRateValue: byId('drainRateValue'),
  emfValue: byId('emfValue'),
  emfBar: byId('emfBar'),
  audioValue: byId('audioValue'),
  audioBar: byId('audioBar'),
  touchValue: byId('touchValue'),
  touchBar: byId('touchBar'),
  rfValue: byId('rfValue'),
  rfBar: byId('rfBar'),
  batteryValue: byId('batteryValue'),
  batteryBar: byId('batteryBar'),
  tempValue: byId('tempValue'),
  tempBar: byId('tempBar'),
  orientationValue: byId('orientationValue'),
  gpsValue: byId('gpsValue'),
  humidityValue: byId('humidityValue'),
  lightValue: byId('lightValue'),
  snapBtn: byId('snapBtn'),
  sensorChips: byId('sensorChips'),
  lowPowerBtn: byId('lowPowerBtn'),
  compactBtn: byId('compactBtn'),
  exportBtn: byId('exportBtn'),
  installBtn: byId('installBtn'),
  modeButtons: Array.from(document.querySelectorAll('.mode-button')),
};

const chipLabelMap = {
  mic: 'Mic',
  motion: 'Motion',
  camera: 'Camera',
  gps: 'GPS',
  battery: 'Battery',
  vibration: 'Haptics',
  touch: 'Touch',
};

export function setPermissionMessage(html) {
  elements.permissionStatus.innerHTML = html;
}

export function setSystemBadge(text, variant = 'idle') {
  elements.systemBadge.textContent = text;
  elements.systemBadge.classList.toggle('status-live', variant === 'live');
  elements.systemBadge.classList.toggle('status-idle', variant === 'idle');
  elements.systemBadge.classList.toggle('status-warn', variant === 'warn');
}

export function setCameraVisible(visible) {
  elements.cameraFeed.classList.toggle('is-visible', visible && state.mode === 'visual');
}

export function flashViewport() {
  elements.flashOverlay.classList.add('is-flashing');
  window.setTimeout(() => elements.flashOverlay.classList.remove('is-flashing'), 180);
}

export function renderStatusChips() {
  if (!elements.sensorChips) return;
  elements.sensorChips.innerHTML = Object.entries(state.statuses)
    .map(([key, value]) => {
      const text = chipLabelMap[key] || key;
      return `<div class="sensor-chip sensor-chip--${value.state}" title="${value.label}"><span>${text}</span><strong>${value.label}</strong></div>`;
    })
    .join('');
}

export function renderUtilityButtons() {
  elements.lowPowerBtn?.classList.toggle('is-active', state.lowPower);
  elements.compactBtn?.classList.toggle('is-active', state.compact);
  elements.lowPowerBtn?.setAttribute('aria-pressed', String(state.lowPower));
  elements.compactBtn?.setAttribute('aria-pressed', String(state.compact));
  if (elements.lowPowerBtn) {
    elements.lowPowerBtn.textContent = state.lowPower ? 'Low Power On' : 'Low Power Off';
  }
  if (elements.compactBtn) {
    elements.compactBtn.textContent = state.compact ? 'Compact On' : 'Compact Off';
  }
  elements.body.classList.toggle('is-low-power', state.lowPower);
  elements.body.classList.toggle('is-compact', state.compact);
}

export function renderModeUI() {
  elements.modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
    button.setAttribute('role', 'tab');
  });
  elements.modeLabel.textContent = `MODE: ${state.mode.toUpperCase()}`;
  elements.closeVisualBtn.classList.toggle('is-visible', state.mode === 'visual');
  elements.visualTarget.classList.toggle('hidden', state.mode !== 'visual');
}

export function renderTelemetry() {
  elements.telemetryLog.innerHTML = state.telemetry
    .map((item) => `<li><span>${item.label}</span><span>${item.value}</span></li>`)
    .join('');
  elements.drainRateValue.textContent = `Drain: ${state.sensors.drain.toFixed(2)}%/min`;
}

export function renderSpiritWords() {
  elements.spiritBox.querySelectorAll('.spirit-word').forEach((node) => node.remove());
  const empty = elements.spiritBox.querySelector('.spirit-empty');
  if (!state.words.length) {
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');
  state.words.forEach((word, index) => {
    const div = document.createElement('div');
    const scale = Math.max(0.55, 1 - index * 0.12) * word.intensity;
    const opacity = Math.max(0.15, 1 - index * 0.18);
    div.className = 'spirit-word';
    div.textContent = word.text;
    div.style.transform = `translate(calc(-50% + ${word.xOffset}px), calc(-50% + ${index * 26}px)) scale(${scale})`;
    div.style.opacity = String(opacity);
    div.style.filter = `blur(${index * 1.5}px)`;
    div.style.color = word.intensity > 1.7 ? '#ffdb85' : '#f3f6fb';
    div.style.textShadow = `0 0 ${8 * word.intensity}px rgba(255,255,255,0.45)`;
    elements.spiritBox.appendChild(div);
  });
}

export function renderReadings() {
  const motion = Math.abs(state.sensors.x) + Math.abs(state.sensors.y) + Math.abs(state.sensors.z);
  const emf = Math.round(motion * 3.4);
  const audioPct = clamp((state.sensors.audio / 255) * 100);
  const touchPct = clamp(state.sensors.touch * 100);
  const rfPct = clamp(state.sensors.rfAvg);
  const batteryPct = state.sensors.battery == null ? 0 : clamp(state.sensors.battery);
  const tempPct = clamp(((state.sensors.temp - 10) / 30) * 100);

  elements.emfValue.textContent = `${emf} mG`;
  elements.audioValue.textContent = `${Math.round(audioPct)} dB`;
  elements.touchValue.textContent = `${Math.round(touchPct)} %`;
  elements.rfValue.textContent = `${Math.round(state.sensors.rfAvg * 1.5)} p/s`;
  elements.batteryValue.textContent = state.sensors.battery == null
    ? 'N/A'
    : `${Math.round(state.sensors.battery)}% · ${state.sensors.drain.toFixed(2)}%/min`;
  elements.tempValue.textContent = `${state.sensors.temp.toFixed(1)}°C · ${Math.round(state.sensors.pressure)} hPa`;
  elements.orientationValue.textContent = `${Math.round(state.sensors.mag || 0)}°`;
  elements.gpsValue.textContent = state.sensors.gps == null ? 'N/A' : `${Math.round(state.sensors.gps)} m`;
  elements.humidityValue.textContent = `${Math.round(state.sensors.humidity)}%`;
  elements.lightValue.textContent = state.sensors.light == null
    ? 'N/A'
    : `${Math.round(state.sensors.light)}% (${state.sensors.lightDelta >= 0 ? '+' : ''}${state.sensors.lightDelta.toFixed(1)})`;
  elements.cameraHud.textContent = state.sensors.light == null ? 'LIGHT: --' : `LIGHT: ${Math.round(state.sensors.light)}%`;

  elements.emfBar.style.width = `${clamp(emf)}%`;
  elements.audioBar.style.width = `${audioPct}%`;
  elements.touchBar.style.width = `${touchPct}%`;
  elements.rfBar.style.width = `${rfPct}%`;
  elements.batteryBar.style.width = `${batteryPct}%`;
  elements.tempBar.style.width = `${tempPct}%`;
}

export function exportSessionLog() {
  const blob = new Blob([
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      settings: {
        lowPower: state.lowPower,
        compact: state.compact,
        mode: state.mode,
      },
      statuses: state.statuses,
      telemetry: state.telemetry,
      session: state.session,
    }, null, 2),
  ], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ghost-meter-session-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function renderAllStatic() {
  renderModeUI();
  renderUtilityButtons();
  renderStatusChips();
  renderTelemetry();
  renderReadings();
  renderSpiritWords();
}
