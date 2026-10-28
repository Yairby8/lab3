// Small synthesized effects keep the game playable offline without audio assets.
(() => {
  let context;
  const melodies = {
    win: [523.25, 659.25, 783.99, 1046.5],
    lose: [392, 311.13, 261.63, 196],
    coin: [987.77, 1318.51]
  };

  function unlock() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!context) context = new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch (_) {
      // Audio is optional; browser restrictions must not interrupt gameplay.
    }
  }

  // Browsers allow audio after a keyboard or pointer gesture. Keep these global
  // so restarting the scene never adds duplicate listeners or audio contexts.
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);

  window.CoinDashAudio = {
    play(name) {
      if (!context || context.state !== 'running' || !melodies[name]) return;
      try {
        const duration = name === 'coin' ? 0.07 : 0.13;
        const start = context.currentTime;
        melodies[name].forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const at = start + index * duration;
          oscillator.type = name === 'lose' ? 'triangle' : 'sine';
          oscillator.frequency.setValueAtTime(frequency, at);
          gain.gain.setValueAtTime(0, at);
          gain.gain.linearRampToValueAtTime(0.12, at + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
          oscillator.start(at);
          oscillator.stop(at + duration);
        });
      } catch (_) {
        // Continue the round normally if audio becomes unavailable.
      }
    }
  };
})();
