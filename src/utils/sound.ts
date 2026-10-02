/**
 * Web Audio API Sound Synthesizer for Puyo Puyo
 * Pure synthesized audio with zero external dependencies.
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  public sfxEnabled: boolean = true;
  public bgmEnabled: boolean = true;
  private bgmOscillators: { stop: () => void }[] = [];
  private bgmIntervalId: number | null = null;
  private isBgmPlaying: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Chain spell voices & names in Japanese
  public static readonly CHAIN_VOICES = [
    'ファイヤー！ (Fire!)',
    'アイスストーム！ (Ice Storm!)',
    'ダイアキュート！ (DiaCute!)',
    'ブレインダムド！ (Brain Damned!)',
    'ジュゲム！ (Jugem!)',
    'ばよえ〜ん！！ (BAYOEN!!)',
    'ばよえ〜ん！！ (BAYOEN!!)',
  ];

  public playMove() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playRotate() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playDrop() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playPop(chainNumber: number) {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Ascending musical scale for each chain combo
    // C5, D5, E5, G5, A5, C6, D6, E6...
    const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
    const freq = baseFreqs[Math.min(chainNumber - 1, baseFreqs.length - 1)];

    // 1st component: Bubbly resonant pop
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq * 0.7, now);
    osc1.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.06);
    osc1.frequency.exponentialRampToValueAtTime(freq, now + 0.16);

    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.linearRampToValueAtTime(0.01, now + 0.18);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.19);

    // 2nd component: Chime harmony for higher chains
    if (chainNumber >= 2) {
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 1.5, now + 0.03);
      osc2.frequency.linearRampToValueAtTime(freq * 2, now + 0.22);

      gain2.gain.setValueAtTime(0.15, now + 0.03);
      gain2.gain.linearRampToValueAtTime(0.01, now + 0.25);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.03);
      osc2.stop(now + 0.26);
    }

    // Special sparkle burst for Bayoen (chain 5+)
    if (chainNumber >= 5) {
      const osc3 = this.ctx.createOscillator();
      const gain3 = this.ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 2.5, now + 0.08);
      osc3.frequency.exponentialRampToValueAtTime(freq * 3, now + 0.35);

      gain3.gain.setValueAtTime(0.18, now + 0.08);
      gain3.gain.linearRampToValueAtTime(0.01, now + 0.4);

      osc3.connect(gain3);
      gain3.connect(this.ctx.destination);
      osc3.start(now + 0.08);
      osc3.stop(now + 0.42);
    }
  }

  public playNuisanceAlert() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.setValueAtTime(220, now + 0.08);
    osc.frequency.setValueAtTime(280, now + 0.16);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playNuisanceDrop() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playAllClear() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.09;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.linearRampToValueAtTime(0.01, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }

  public playWin() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    // Victory fanfare: C - G - E - C5 - D5 - E5
    const notes = [523.25, 783.99, 659.25, 1046.50, 1174.66, 1318.51];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.11;
      const dur = idx === notes.length - 1 ? 0.5 : 0.15;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.linearRampToValueAtTime(0.01, startTime + dur);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);
    });
  }

  public playLose() {
    if (!this.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 392, 349.23, 293.66];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = now + idx * 0.14;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.linearRampToValueAtTime(0.01, startTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.24);
    });
  }

  /**
   * Upbeat cheerful arcade melody loop
   */
  public startBGM() {
    if (!this.bgmEnabled || this.isBgmPlaying) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    const tempo = 145; // BPM
    const beatDuration = 60 / tempo; // ~0.41s
    const eighthNote = beatDuration / 2;

    // Classic cheerful Japanese puzzle game melody loop in F Major
    const melody: [number, number][] = [
      // freq, duration in eighth notes
      [349.23, 1], [440.00, 1], [523.25, 1], [587.33, 1],
      [659.25, 2], [587.33, 1], [523.25, 1],
      [440.00, 2], [349.23, 2],
      [392.00, 2], [523.25, 2],
      // Part 2
      [659.25, 1], [698.46, 1], [783.99, 2],
      [659.25, 1], [587.33, 1], [523.25, 2],
      [440.00, 1], [523.25, 1], [587.33, 2],
      [523.25, 4],
    ];

    let currentStep = 0;
    const totalSteps = melody.reduce((acc, note) => acc + note[1], 0);

    const playLoop = () => {
      if (!this.isBgmPlaying || !this.bgmEnabled || !this.ctx) return;

      const now = this.ctx.currentTime;
      let accumTime = 0;

      melody.forEach(([freq, dur]) => {
        const noteDuration = dur * eighthNote;
        const noteStart = now + accumTime;

        // Lead synth
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.025, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.005, noteStart + noteDuration * 0.85);
        gain.gain.linearRampToValueAtTime(0, noteStart + noteDuration);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(noteStart);
        osc.stop(noteStart + noteDuration);

        // Bass accompaniment
        const bassOsc = this.ctx!.createOscillator();
        const bassGain = this.ctx!.createGain();

        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(freq / 2, noteStart);

        bassGain.gain.setValueAtTime(0.035, noteStart);
        bassGain.gain.linearRampToValueAtTime(0.005, noteStart + noteDuration * 0.7);

        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx!.destination);

        bassOsc.start(noteStart);
        bassOsc.stop(noteStart + noteDuration);

        accumTime += noteDuration;
      });

      // Schedule next loop iteration
      this.bgmIntervalId = window.setTimeout(playLoop, totalSteps * eighthNote * 1000 - 40);
    };

    playLoop();
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      window.clearTimeout(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  public toggleBGM(): boolean {
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
    return this.bgmEnabled;
  }

  public toggleSFX(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }
}

export const soundManager = new SoundManager();
