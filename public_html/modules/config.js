export const PROFILES = {
  field: {
    label: 'Field mode',
    lowPowerDefault: true,
    fogOpacity: 0.18,
    spiritInterval: 950,
    visualBloom: 0.7,
  },
  show: {
    label: 'Show mode',
    lowPowerDefault: false,
    fogOpacity: 0.34,
    spiritInterval: 500,
    visualBloom: 1,
  },
};

export const PRESETS = {
  'quiet-cemetery': {
    label: 'Quiet cemetery',
    rfMultiplier: 0.7,
    anomalyBias: 0.8,
    wordBias: 0.9,
    theme: 'sepulchral',
  },
  'storm-interference': {
    label: 'Storm interference',
    rfMultiplier: 1.3,
    anomalyBias: 1.15,
    wordBias: 1.0,
    theme: 'tempest',
  },
  'haunted-house': {
    label: 'Haunted house',
    rfMultiplier: 1.0,
    anomalyBias: 1.25,
    wordBias: 1.2,
    theme: 'haunt',
  },
  'full-nonsense': {
    label: 'Full nonsense mode',
    rfMultiplier: 1.8,
    anomalyBias: 1.6,
    wordBias: 1.5,
    theme: 'chaos',
  },
};

export const THRESHOLDS = {
  anomalyWarn: 48,
  anomalyLock: 72,
  timelineLimit: 18,
};
