import { WORDS, state } from './state.js';
import { renderWords } from './ui.js';

export function maybeSpawnWord() {
  if (!state.live || state.mode === 'visual') return;

  const total = Math.sqrt((state.s.x ** 2) + (state.s.y ** 2) + (state.s.z ** 2));
  const motion = Math.min(Math.abs(total - 9.8) / 5, 1);
  const audio = Math.min(state.s.audio / 100, 1);
  const rf = state.s.rfNoise > 85 ? 1 : 0;
  const probability = 0.02 + (motion * 0.4) + (audio * 0.5) + (rf * 0.3);

  if (probability > 0.8 || Math.random() < probability) {
    const intensity = Math.min(2.4, 0.8 + motion + audio + (state.s.touch * 0.6));
    state.words = [
      {
        text: WORDS[Math.floor(Math.random() * WORDS.length)],
        x: (Math.random() - 0.5) * 130,
        i: intensity,
      },
      ...state.words,
    ].slice(0, 6);

    renderWords();
    if (navigator.vibrate) navigator.vibrate(Math.floor(45 + intensity * 75));
  }
}
