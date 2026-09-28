/**
 * Sound-Engine auf Basis der Web Audio API.
 *
 * Alle Sounds werden in Echtzeit synthetisiert (Oszillatoren, Rauschen, Filter).
 * Es gibt keine Audiodateien: nichts zu laden, keine Latenz, winzige Bundle-Größe.
 *
 * Signalweg:  Sound → Master-Gain (Lautstärke/Mute) → Kompressor → Lautsprecher
 *
 * Browser erlauben Audio erst nach einer Nutzerinteraktion. Deshalb wird der
 * AudioContext beim ersten Klick/Tastendruck erzeugt (unlock()).
 */

export type SoundId =
  | "click"
  | "hover"
  | "bet"
  | "cashout"
  | "win"
  | "bigWin"
  | "lose"
  | "gem"
  | "mine"
  | "explosion"
  | "tick"
  | "peg"
  | "land"
  | "countdown";

export interface PlayOptions {
  /** Tonhöhen-Faktor, 1 = normal */
  pitch?: number;
  /** Lautstärke-Faktor, 1 = normal */
  volume?: number;
}

/** Mindestabstand zwischen zwei gleichen Sounds (ms), verhindert Klang-Matsch. */
const THROTTLE_MS: Partial<Record<SoundId, number>> = {
  hover: 45,
  tick: 22,
  peg: 18,
  land: 40,
  click: 30,
};

type Voice = (ctx: AudioContext, out: AudioNode, t: number, o: Required<PlayOptions>) => void;

interface ToneSpec {
  type: OscillatorType;
  freq: number;
  freqEnd?: number;
  start: number;
  duration: number;
  gain: number;
  attack?: number;
  detune?: number;
}

interface NoiseSpec {
  start: number;
  duration: number;
  gain: number;
  filter: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private volume = 0.7;
  private readonly lastPlayed = new Map<SoundId, number>();

  // ---------------------------------------------------------------------------
  // Öffentliche API
  // ---------------------------------------------------------------------------

  /** Beim ersten Nutzer-Klick aufrufen (Autoplay-Richtlinie der Browser). */
  unlock(): void {
    this.ensureContext();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolume();
  }

  setVolume(volume: number): void {
    this.volume = volume;
    this.applyVolume();
  }

  play(id: SoundId, options: PlayOptions = {}): void {
    if (this.muted) return;
    const now = performance.now();
    const throttle = THROTTLE_MS[id];
    if (throttle !== undefined && now - (this.lastPlayed.get(id) ?? -Infinity) < throttle) return;
    this.lastPlayed.set(id, now);

    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    VOICES[id](this, ctx, this.master, ctx.currentTime + 0.005, {
      pitch: options.pitch ?? 1,
      volume: options.volume ?? 1,
    });
  }

  /** Anhaltender Spannungs-Sound für Crash. Wird mit dem Multiplikator höher. */
  startTension(): TensionVoice | null {
    if (this.muted) return null;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return null;
    return new TensionVoice(ctx, this.master);
  }

  // ---------------------------------------------------------------------------
  // Bausteine für die Klang-Synthese
  // ---------------------------------------------------------------------------

  tone(ctx: AudioContext, out: AudioNode, spec: ToneSpec): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const attack = spec.attack ?? 0.004;
    const end = spec.start + spec.duration;

    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, spec.start);
    if (spec.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.freqEnd), end);
    }
    if (spec.detune) osc.detune.value = spec.detune;

    gain.gain.setValueAtTime(0.0001, spec.start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, spec.gain), spec.start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain).connect(out);
    osc.start(spec.start);
    osc.stop(end + 0.02);
  }

  noise(ctx: AudioContext, out: AudioNode, spec: NoiseSpec): void {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const end = spec.start + spec.duration;

    source.buffer = this.getNoiseBuffer(ctx);
    source.loop = true;
    filter.type = spec.filter;
    filter.Q.value = spec.q ?? 0.8;
    filter.frequency.setValueAtTime(spec.freq, spec.start);
    if (spec.freqEnd !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(1, spec.freqEnd), end);
    }

    gain.gain.setValueAtTime(0.0001, spec.start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, spec.gain), spec.start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter).connect(gain).connect(out);
    source.start(spec.start, Math.random() * 0.5);
    source.stop(end + 0.02);
  }

  // ---------------------------------------------------------------------------
  // Intern
  // ---------------------------------------------------------------------------

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;

      const ctx = new Ctor({ latencyHint: "interactive" });
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.2;

      const master = ctx.createGain();
      master.connect(compressor).connect(ctx.destination);

      this.ctx = ctx;
      this.master = master;
      this.applyVolume();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private applyVolume(): void {
    if (!this.ctx || !this.master) return;
    const target = this.muted ? 0 : this.volume * 0.9;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const length = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }
}

/** Crash-Spannung: Sägezahn durch resonanten Tiefpass, Tremolo wird schneller. */
export class TensionVoice {
  private readonly osc: OscillatorNode;
  private readonly sub: OscillatorNode;
  private readonly lfo: OscillatorNode;
  private readonly filter: BiquadFilterNode;
  private readonly gain: GainNode;
  private stopped = false;

  constructor(
    private readonly ctx: AudioContext,
    out: AudioNode,
  ) {
    const t = ctx.currentTime;
    this.osc = ctx.createOscillator();
    this.sub = ctx.createOscillator();
    this.lfo = ctx.createOscillator();
    this.filter = ctx.createBiquadFilter();
    this.gain = ctx.createGain();
    const lfoDepth = ctx.createGain();
    const subGain = ctx.createGain();

    this.osc.type = "sawtooth";
    this.osc.frequency.value = 80;
    this.sub.type = "sine";
    this.sub.frequency.value = 40;
    subGain.gain.value = 0.6;

    this.filter.type = "lowpass";
    this.filter.Q.value = 9;
    this.filter.frequency.value = 280;

    this.lfo.type = "sine";
    this.lfo.frequency.value = 3;
    lfoDepth.gain.value = 0.025;

    this.gain.gain.setValueAtTime(0.0001, t);
    this.gain.gain.exponentialRampToValueAtTime(0.05, t + 0.4);

    this.osc.connect(this.filter);
    this.sub.connect(subGain).connect(this.filter);
    this.filter.connect(this.gain).connect(out);
    this.lfo.connect(lfoDepth).connect(this.gain.gain);

    this.osc.start(t);
    this.sub.start(t);
    this.lfo.start(t);
  }

  update(multiplier: number): void {
    if (this.stopped) return;
    const t = this.ctx.currentTime;
    const intensity = Math.log(Math.max(1, multiplier));
    this.osc.frequency.setTargetAtTime(Math.min(420, 80 * multiplier ** 0.45), t, 0.08);
    this.sub.frequency.setTargetAtTime(Math.min(210, 40 * multiplier ** 0.45), t, 0.08);
    this.filter.frequency.setTargetAtTime(Math.min(4200, 280 + 1100 * intensity), t, 0.08);
    this.lfo.frequency.setTargetAtTime(Math.min(16, 3 + 4 * intensity), t, 0.1);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setTargetAtTime(0.0001, t, 0.05);
    for (const node of [this.osc, this.sub, this.lfo]) node.stop(t + 0.3);
  }
}

type VoiceWithEngine = (
  engine: AudioEngine,
  ...args: Parameters<Voice>
) => ReturnType<Voice>;

const NOTE = { C6: 1046.5, E6: 1318.51, G6: 1567.98, A6: 1760, C7: 2093, E7: 2637.02 };

const VOICES: Record<SoundId, VoiceWithEngine> = {
  click: (e, ctx, out, t, o) => {
    e.tone(ctx, out, { type: "square", freq: 1800 * o.pitch, freqEnd: 900, start: t, duration: 0.035, gain: 0.05 * o.volume });
    e.noise(ctx, out, { start: t, duration: 0.02, gain: 0.04 * o.volume, filter: "highpass", freq: 3500 });
  },
  hover: (e, ctx, out, t, o) => {
    e.tone(ctx, out, { type: "sine", freq: 2600 * o.pitch, start: t, duration: 0.02, gain: 0.018 * o.volume });
  },
  bet: (e, ctx, out, t, o) => {
    e.tone(ctx, out, { type: "triangle", freq: 440 * o.pitch, freqEnd: 880 * o.pitch, start: t, duration: 0.09, gain: 0.12 * o.volume });
    e.tone(ctx, out, { type: "sine", freq: 1320 * o.pitch, start: t + 0.05, duration: 0.1, gain: 0.06 * o.volume });
  },
  cashout: (e, ctx, out, t, o) => {
    e.tone(ctx, out, { type: "sine", freq: NOTE.E6 * o.pitch, start: t, duration: 0.18, gain: 0.14 * o.volume });
    e.tone(ctx, out, { type: "triangle", freq: NOTE.A6 * o.pitch, start: t + 0.07, duration: 0.32, gain: 0.12 * o.volume });
    e.tone(ctx, out, { type: "sine", freq: NOTE.E7 * o.pitch, start: t + 0.07, duration: 0.25, gain: 0.03 * o.volume });
    e.noise(ctx, out, { start: t + 0.05, duration: 0.25, gain: 0.03 * o.volume, filter: "highpass", freq: 7000 });
  },
  win: (e, ctx, out, t, o) => {
    [NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7].forEach((freq, i) => {
      e.tone(ctx, out, { type: "sine", freq: freq * o.pitch, start: t + i * 0.06, duration: 0.35, gain: 0.1 * o.volume });
      e.tone(ctx, out, { type: "sine", freq: freq * 2.76 * o.pitch, start: t + i * 0.06, duration: 0.12, gain: 0.015 * o.volume });
    });
  },
  bigWin: (e, ctx, out, t, o) => {
    [NOTE.C6, NOTE.E6, NOTE.G6, NOTE.C7, NOTE.E7, NOTE.C7, NOTE.E7].forEach((freq, i) => {
      e.tone(ctx, out, { type: i % 2 ? "triangle" : "sine", freq: freq * o.pitch, start: t + i * 0.07, duration: 0.45, gain: 0.1 * o.volume });
    });
    e.tone(ctx, out, { type: "sine", freq: 110, freqEnd: 55, start: t, duration: 0.6, gain: 0.2 * o.volume });
    e.noise(ctx, out, { start: t + 0.1, duration: 0.8, gain: 0.04 * o.volume, filter: "highpass", freq: 6500 });
  },
  lose: (e, ctx, out, t, o) => {
    e.tone(ctx, out, { type: "sawtooth", freq: 220 * o.pitch, freqEnd: 90, start: t, duration: 0.28, gain: 0.05 * o.volume });
    e.tone(ctx, out, { type: "sine", freq: 110 * o.pitch, freqEnd: 55, start: t, duration: 0.3, gain: 0.12 * o.volume });
  },
  gem: (e, ctx, out, t, o) => {
    e.tone(ctx, out, { type: "sine", freq: NOTE.G6 * o.pitch, start: t, duration: 0.4, gain: 0.11 * o.volume });
    e.tone(ctx, out, { type: "sine", freq: NOTE.G6 * 1.5 * o.pitch, start: t + 0.02, duration: 0.35, gain: 0.06 * o.volume, detune: 6 });
    e.tone(ctx, out, { type: "triangle", freq: NOTE.G6 * 2 * o.pitch, start: t + 0.04, duration: 0.2, gain: 0.03 * o.volume });
    e.noise(ctx, out, { start: t, duration: 0.18, gain: 0.03 * o.volume, filter: "bandpass", freq: 9000, q: 2 });
  },
  mine: (e, ctx, out, t, o) => {
    e.noise(ctx, out, { start: t, duration: 0.55, gain: 0.45 * o.volume, filter: "lowpass", freq: 1600, freqEnd: 120, q: 1.2 });
    e.tone(ctx, out, { type: "sine", freq: 95, freqEnd: 38, start: t, duration: 0.45, gain: 0.5 * o.volume });
  },
  explosion: (e, ctx, out, t, o) => {
    e.noise(ctx, out, { start: t, duration: 1.2, gain: 0.55 * o.volume, filter: "lowpass", freq: 2400, freqEnd: 70, q: 1 });
    e.noise(ctx, out, { start: t + 0.02, duration: 0.35, gain: 0.2 * o.volume, filter: "highpass", freq: 2500 });
    e.tone(ctx, out, { type: "sine", freq: 80, freqEnd: 28, start: t, duration: 0.9, gain: 0.6 * o.volume });
  },
  tick: (e, ctx, out, t, o) => {
    e.tone(ctx, out, { type: "square", freq: 1100 * o.pitch, start: t, duration: 0.014, gain: 0.03 * o.volume });
  },
  peg: (e, ctx, out, t, o) => {
    e.tone(ctx, out, { type: "sine", freq: 1400 * o.pitch, start: t, duration: 0.05, gain: 0.03 * o.volume });
  },
  land: (e, ctx, out, t, o) => {
    e.tone(ctx, out, { type: "triangle", freq: 520 * o.pitch, freqEnd: 780 * o.pitch, start: t, duration: 0.12, gain: 0.08 * o.volume });
  },
  countdown: (e, ctx, out, t, o) => {
    e.tone(ctx, out, { type: "sine", freq: 880 * o.pitch, start: t, duration: 0.07, gain: 0.05 * o.volume });
  },
};

/** App-weite Instanz (lazy: erzeugt den AudioContext erst bei Bedarf). */
export const audio = new AudioEngine();
