/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Retro Synth & Web Audio Engine for SnowDrift
class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Engine synth nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Snow crunch noise nodes
  private crunchGain: GainNode | null = null;
  private crunchFilter: BiquadFilterNode | null = null;
  private crunchSource: AudioBufferSourceNode | null = null;

  // Music state
  private musicInterval: number | null = null;
  private isMusicPlaying: boolean = false;

  private isInitialized = false;

  public init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.setupEngineSynth();
      this.setupCrunchSynth();
      this.isInitialized = true;
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  private ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // --- ENGINE SYNTH ---
  private setupEngineSynth() {
    if (!this.ctx || !this.sfxGain) return;

    // Heavy diesel cylinder compression rumble
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';

    this.engineOsc1.frequency.setValueAtTime(32, this.ctx.currentTime);
    this.engineOsc2.frequency.setValueAtTime(32.4, this.ctx.currentTime);

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.8, this.ctx.currentTime);

    this.engineGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  public updateEngine(speedFraction: number, isAccelerating: boolean, isDiffLock: boolean = false) {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;
    this.ensureRunning();

    const t = this.ctx.currentTime;
    // Heavy diesel RPM sound (30Hz idle to 75Hz peak)
    const loadFactor = isDiffLock ? 1.25 : 1.0;
    const baseFreq = (30 + speedFraction * 42 + (isAccelerating ? 14 : 0)) * loadFactor;
    const filterFreq = (95 + speedFraction * 210 + (isAccelerating ? 80 : 0)) * loadFactor;
    const vol = this.isMuted ? 0 : 0.09 + speedFraction * 0.16 + (isAccelerating ? 0.08 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.06);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.015, t, 0.06);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.06);
    this.engineGain.gain.setTargetAtTime(vol, t, 0.06);
  }

  // --- PNEUMATIC AIR BRAKE HISS (SnowRunner / Heavy Truck Authentic) ---
  public playAirBrake() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2800, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  // --- DIFFERENTIAL LOCK ENGAGE / HYDRAULIC CLANK ---
  public playDiffLockToggle(engaged: boolean) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(engaged ? 160 : 110, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // --- HYDRAULIC BLADE ANGLE SHIFT ---
  public playBladeShift() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.linearRampToValueAtTime(680, t + 0.15);
    osc.frequency.linearRampToValueAtTime(320, t + 0.3);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(3.5, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.38);
  }

  // --- SNOW CRUNCH NOISE SYNTH ---
  private setupCrunchSynth() {
    if (!this.ctx || !this.sfxGain) return;

    // Generate 2 seconds of pink/white noise buffer for crunchy snow plowing
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.15;
    }

    this.crunchSource = this.ctx.createBufferSource();
    this.crunchSource.buffer = buffer;
    this.crunchSource.loop = true;

    this.crunchFilter = this.ctx.createBiquadFilter();
    this.crunchFilter.type = 'bandpass';
    this.crunchFilter.frequency.setValueAtTime(650, this.ctx.currentTime);
    this.crunchFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.crunchGain = this.ctx.createGain();
    this.crunchGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.crunchSource.connect(this.crunchFilter);
    this.crunchFilter.connect(this.crunchGain);
    this.crunchGain.connect(this.sfxGain);

    this.crunchSource.start();
  }

  public updateSnowCrunch(plowRate: number) {
    if (!this.ctx || !this.crunchGain || !this.crunchFilter) return;
    const t = this.ctx.currentTime;
    const clampedRate = Math.min(Math.max(plowRate, 0), 1);
    const targetGain = this.isMuted ? 0 : clampedRate * 0.22;
    const targetFreq = 500 + clampedRate * 450;

    this.crunchGain.gain.setTargetAtTime(targetGain, t, 0.05);
    this.crunchFilter.frequency.setTargetAtTime(targetFreq, t, 0.06);
  }

  // --- RETRO SYNTH COMBO CHIMES ---
  // Ascending pentatonic bell chime tones for combo streaks
  public playComboChime(comboTier: number) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    // Pentatonic scale in Hz
    const scale = [
      261.63, 293.66, 329.63, 392.00, 440.00, // C4 - A4
      523.25, 587.33, 659.25, 783.99, 880.00, // C5 - A5
      1046.50, 1174.66, 1318.51, 1567.98       // C6 - G6
    ];

    const noteIndex = Math.min(Math.max(0, Math.floor(comboTier * 1.5)), scale.length - 1);
    const freq = scale[noteIndex];

    const t = this.ctx.currentTime;

    // Carrier oscillator
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, t);

    // Modulator for FM crystalline chime sound
    const modulator = this.ctx.createOscillator();
    modulator.type = 'triangle';
    modulator.frequency.setValueAtTime(freq * 2.76, t);

    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(freq * 1.2, t);
    modGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    const noteGain = this.ctx.createGain();
    noteGain.gain.setValueAtTime(0.25, t);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    carrier.connect(noteGain);
    noteGain.connect(this.sfxGain);

    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + 0.6);
    modulator.stop(t + 0.6);
  }

  // --- COZY PICKUP SOUND ---
  public playItemPickup(isRare: boolean = false) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    const t = this.ctx.currentTime;
    const notes = isRare ? [523.25, 659.25, 783.99, 1046.50] : [587.33, 880.00];

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.setValueAtTime(0.18, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.4);
    });
  }

  // --- CAR FREED CELEBRATION FANFARE ---
  public playCarFreed() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    const t = this.ctx.currentTime;
    // Friendly dual car horn
    [349.23, 440.00].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.setValueAtTime(0.12, t + 0.15);
      gain.gain.setValueAtTime(0.0001, t + 0.16);
      gain.gain.setValueAtTime(0.14, t + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  // --- TURBO BOOST WHOOSH ---
  public playBoostSound() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.4);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(1600, t + 0.4);
    filter.Q.setValueAtTime(2.5, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.6);
  }

  // --- RETRO SYNTH TRUCK HORN ---
  public playHorn() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    const t = this.ctx.currentTime;

    // Retro dual-tone synth horn with resonant filter sweep (classic 80s arcade brass)
    const tones = [
      { freq: 233.08, type: 'sawtooth' as OscillatorType, gain: 0.18 }, // Bb3
      { freq: 293.66, type: 'sawtooth' as OscillatorType, gain: 0.16 }, // D4
      { freq: 349.23, type: 'square' as OscillatorType, gain: 0.09 },   // F4 (warm brass overtone)
    ];

    // Double beep rhythm: punchy primary beep followed closely by secondary beep
    const beeps = [
      { start: t, duration: 0.16, decay: 0.05 },
      { start: t + 0.18, duration: 0.22, decay: 0.08 },
    ];

    beeps.forEach((beep) => {
      // Swept resonant bandpass/lowpass filter for synth bite
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, beep.start);
      filter.frequency.exponentialRampToValueAtTime(750, beep.start + beep.duration);
      filter.Q.setValueAtTime(4.0, beep.start); // resonant arcade bite

      const beepGain = this.ctx!.createGain();
      beepGain.gain.setValueAtTime(0.001, beep.start);
      beepGain.gain.linearRampToValueAtTime(0.3, beep.start + 0.02);
      beepGain.gain.setValueAtTime(0.28, beep.start + beep.duration - beep.decay);
      beepGain.gain.exponentialRampToValueAtTime(0.0001, beep.start + beep.duration);

      filter.connect(beepGain);
      beepGain.connect(this.sfxGain!);

      tones.forEach((tone) => {
        const osc = this.ctx!.createOscillator();
        osc.type = tone.type;
        // Subtle downward pitch sag on horn release
        osc.frequency.setValueAtTime(tone.freq, beep.start);
        osc.frequency.exponentialRampToValueAtTime(tone.freq * 0.96, beep.start + beep.duration);

        const oscGain = this.ctx!.createGain();
        oscGain.gain.setValueAtTime(tone.gain, beep.start);

        osc.connect(oscGain);
        oscGain.connect(filter);

        osc.start(beep.start);
        osc.stop(beep.start + beep.duration + 0.02);
      });
    });
  }

  // --- OBSTACLE THUD ---
  public playObstacleBump() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // --- UPGRADE SHOP FANFARE ---
  public playUpgradePurchased() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.ensureRunning();

    const t = this.ctx.currentTime;
    const chords = [329.63, 415.30, 493.88, 659.25]; // E major arpeggio
    chords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.setValueAtTime(0.2, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.45);
    });
  }

  // --- COZY PROCEDURAL CHILL SYNTH AMBIENCE ---
  public startMusic() {
    if (this.isMusicPlaying) return;
    this.init();
    this.ensureRunning();
    this.isMusicPlaying = true;

    // Cozy winter chord progression: Fmaj7 -> Gsus4 -> Em7 -> Am9
    const progressions = [
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 392.00], // G
      [164.81, 196.00, 246.94, 329.63], // Em7
      [110.00, 164.81, 220.00, 261.63]  // Am
    ];

    let chordIndex = 0;

    const playChord = () => {
      if (!this.ctx || !this.musicGain || this.isMuted || !this.isMusicPlaying) return;

      const t = this.ctx.currentTime;
      const currentChord = progressions[chordIndex];
      chordIndex = (chordIndex + 1) % progressions.length;

      // Play soft warm pad
      currentChord.forEach(freq => {
        const osc = this.ctx!.createOscillator();
        const filter = this.ctx!.createBiquadFilter();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.045, t + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 3.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain!);

        osc.start(t);
        osc.stop(t + 4.0);
      });

      // Play a soft high bell note randomly on the beat
      if (Math.random() > 0.3) {
        const bellFreq = currentChord[Math.floor(Math.random() * currentChord.length)] * 2;
        const bellOsc = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();

        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(bellFreq, t + 0.6);

        bellGain.gain.setValueAtTime(0.001, t);
        bellGain.gain.setValueAtTime(0.035, t + 0.6);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);

        bellOsc.connect(bellGain);
        bellGain.connect(this.musicGain);

        bellOsc.start(t + 0.6);
        bellOsc.stop(t + 2.4);
      }
    };

    playChord();
    this.musicInterval = window.setInterval(playChord, 3800);
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isMusicPlaying = false;
  }

  public toggleMute(): boolean {
    this.init();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const synthAudio = new SynthAudioEngine();
