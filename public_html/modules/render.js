import { state } from './state.js';
import { ctx } from './dom.js';

export function updateEnvironment() {
  if (state.frame % 50 === 0) {
    const motion = (Math.abs(state.s.x) + Math.abs(state.s.y) + Math.abs(state.s.z)) / 30;
    state.s.temp += (Math.random() - 0.5) * 0.12 - motion * 0.04;
    state.s.pressure += (Math.random() - 0.5) * 0.8;
    state.s.humidity = Math.max(0, Math.min(100, state.s.humidity + (Math.random() - 0.5) * 1.2));
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

export function drawCanvas() {
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
    const size = 72 * ratio;
    const cx = width / 2;
    const cy = height / 2;
    const x = cx - size / 2;
    const y = cy - size / 2;
    const c = 18 * ratio;
    ctx.beginPath();
    ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
    ctx.moveTo(x + size - c, y); ctx.lineTo(x + size, y); ctx.lineTo(x + size, y + c);
    ctx.moveTo(x, y + size - c); ctx.lineTo(x, y + size); ctx.lineTo(x + c, y + size);
    ctx.moveTo(x + size - c, y + size); ctx.lineTo(x + size, y + size); ctx.lineTo(x + size, y + size - c);
    ctx.stroke();
  }
}
