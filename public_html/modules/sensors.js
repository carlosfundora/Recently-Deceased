import { state } from './state.js';
import { els, lightCtx } from './dom.js';
import { log, setSensorStatus, updateCameraUI } from './ui.js';

export const handlers = {
  motion: event => {
    state.s.x = event.accelerationIncludingGravity?.x ?? state.s.x;
    state.s.y = event.accelerationIncludingGravity?.y ?? state.s.y;
    state.s.z = event.accelerationIncludingGravity?.z ?? state.s.z;
  },
  orientation: event => {
    state.s.mag = event.alpha ?? state.s.mag;
  },
  touch: event => {
    const touch = event.touches[0];
    if (!touch) return;
    const force = typeof touch.force === 'number' && touch.force > 0 ? touch.force : Math.min(1, 0.35 + event.touches.length * 0.15);
    setTouchForce(force);
  },
  touchEnd: () => setTouchForce(0),
};

export async function requestMotionPermission() {
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

export async function startAudio() {
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

export async function startCamera() {
  if (state.cameraStream || !state.live || state.mode !== 'visual') return;
  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    els.video.srcObject = state.cameraStream;
    setSensorStatus('camera', 'ok', 'Camera: live');
    updateCameraUI();
    log('Camera', 'Online');
  } catch {
    setSensorStatus('camera', 'warn', 'Camera: blocked');
    log('Camera', 'Unavailable');
  }
}

export function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  els.video.srcObject = null;
  updateCameraUI();
}

export function attachSensors() {
  if (state.sensorsAttached) return;
  window.addEventListener('devicemotion', handlers.motion, { passive: true });
  window.addEventListener('deviceorientation', handlers.orientation, { passive: true });
  window.addEventListener('touchstart', handlers.touch, { passive: true });
  window.addEventListener('touchmove', handlers.touch, { passive: true });
  window.addEventListener('touchend', handlers.touchEnd, { passive: true });
  state.sensorsAttached = true;
}

export function detachSensors() {
  if (!state.sensorsAttached) return;
  window.removeEventListener('devicemotion', handlers.motion);
  window.removeEventListener('deviceorientation', handlers.orientation);
  window.removeEventListener('touchstart', handlers.touch);
  window.removeEventListener('touchmove', handlers.touch);
  window.removeEventListener('touchend', handlers.touchEnd);
  state.sensorsAttached = false;
}

export function attachGeolocation() {
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

export function detachGeolocation() {
  if (state.geoWatch != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(state.geoWatch);
    state.geoWatch = null;
  }
}

export function attachBattery() {
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

export function detachBattery() {
  if (state.batteryManager && state.batteryListener) {
    state.batteryManager.removeEventListener('levelchange', state.batteryListener);
  }
  state.batteryManager = null;
  state.batteryListener = null;
}

export function setTouchForce(value) {
  state.s.touch = Math.max(0, Math.min(1, value));
  clearTimeout(state.touchReset);
  state.touchReset = setTimeout(() => {
    state.s.touch = 0;
  }, 160);
}

export function sampleAudio() {
  if (!state.analyser || !state.data) return;
  state.analyser.getByteFrequencyData(state.data);
  state.s.audio = state.data.reduce((sum, value) => sum + value, 0) / state.data.length;
}

export function sampleLight() {
  if (state.mode !== 'visual' || !lightCtx || !state.cameraStream || !els.video.videoWidth) return;
  const sampleEvery = state.lowPower ? 20 : 10;
  if (state.frame % sampleEvery !== 0) return;
  try {
    lightCtx.drawImage(els.video, 0, 0, 32, 32);
    const image = lightCtx.getImageData(0, 0, 32, 32);
    let total = 0;
    for (let i = 0; i < image.data.length; i += 4) {
      total += (image.data[i] + image.data[i + 1] + image.data[i + 2]) / 3;
    }
    const level = (total / (32 * 32) / 255) * 100;
    state.s.lightDelta = state.s.light == null ? 0 : level - state.s.light;
    state.s.light = level;
  } catch {}
}
