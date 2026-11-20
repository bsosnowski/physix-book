/**
 * Opt-in simulation audio. The widget creates an AudioContext ONLY on an
 * explicit user click (never autoplay), and suspends/resumes it with the
 * play/pause state. Sims declare a `SimAudio` descriptor mapping their
 * state to oscillator frequencies/gain — no audio code inside sims.
 */

export interface AudioVoice {
  /** Hz; 0 or non-finite = voice silent. */
  freq: number;
  /** 0..1 relative gain. */
  gain?: number;
}

export interface SimAudio<S = unknown> {
  /** Up to a few voices (oscillators). Re-evaluated ~10×/s. */
  voices(state: S): AudioVoice[];
}

export const MASTER_GAIN = 0.06; // gentle, matches the Tone component

export class SimAudioEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private oscs: OscillatorNode[] = [];
  private gains: GainNode[] = [];

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(this.ctx.destination);
  }

  /** Create/adjust oscillators to match the voice list. */
  update(voices: AudioVoice[]): void {
    // grow pool if needed
    while (this.oscs.length < voices.length) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.oscs.push(osc);
      this.gains.push(gain);
    }
    const now = this.ctx.currentTime;
    this.oscs.forEach((osc, i) => {
      const v = voices[i];
      const active = v && Number.isFinite(v.freq) && v.freq > 0;
      if (active) {
        // smooth glides (Doppler) instead of zipper noise
        osc.frequency.setTargetAtTime(v.freq, now, 0.05);
      }
      this.gains[i].gain.setTargetAtTime(
        active ? Math.min(1, Math.max(0, v.gain ?? 1)) : 0,
        now,
        0.03,
      );
    });
  }

  suspend(): void {
    void this.ctx.suspend();
  }

  resume(): void {
    void this.ctx.resume();
  }

  dispose(): void {
    this.oscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    });
    void this.ctx.close();
  }
}
