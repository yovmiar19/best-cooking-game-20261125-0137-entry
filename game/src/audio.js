// Synthesized WebAudio sounds — no audio files, everything is oscillators.
// One job: every chop, sizzle, ding and cheer the kitchen makes.
export class SoundBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = true;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.context = new Ctor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.context.destination);
  }

  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.context || !this.enabled) return;
    const t0 = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, filterFreq, when = 0) {
    if (!this.context || !this.enabled) return;
    const t0 = this.context.currentTime + when;
    const len = Math.max(1, Math.floor(this.context.sampleRate * dur));
    const buf = this.context.createBuffer(1, len, this.context.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.context.createBufferSource();
    src.buffer = buf;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  click() { this.tone(660, 0.06, 'square', 0.12); }
  pickup() { this.tone(520, 0.08, 'sine', 0.2, 0, 780); }
  chop() { this.noise(0.09, 0.5, 1800); this.tone(180, 0.07, 'triangle', 0.25); }
  sizzleStart() { this.noise(0.5, 0.25, 4200); }
  sizzleLoop() { this.noise(0.18, 0.12, 5000); }
  ding() { this.tone(880, 0.25, 'sine', 0.25); this.tone(1318, 0.35, 'sine', 0.18, 0.08); }
  serve() {
    this.tone(523, 0.12, 'triangle', 0.25);
    this.tone(659, 0.12, 'triangle', 0.25, 0.1);
    this.tone(784, 0.22, 'triangle', 0.28, 0.2);
  }
  coin() { this.tone(988, 0.1, 'square', 0.12); this.tone(1319, 0.18, 'square', 0.12, 0.08); }
  fail() { this.tone(220, 0.3, 'sawtooth', 0.18, 0, 140); }
  expired() { this.tone(330, 0.2, 'sawtooth', 0.2, 0, 180); this.tone(262, 0.35, 'sawtooth', 0.2, 0.18, 130); }
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.22, i * 0.22));
  }
  rush() { this.tone(1046, 0.1, 'square', 0.14); this.tone(1046, 0.1, 'square', 0.14, 0.14); }

  // A light gamelan-ish pentatonic loop, scheduled note by note.
  startMusic() {
    this.ensure();
    if (!this.context || this.musicTimer) return;
    const scale = [523, 587, 659, 784, 880, 1046];
    this.musicTimer = setInterval(() => {
      if (!this.enabled) return;
      const note = scale[this.musicStep % scale.length];
      this.tone(note, 0.5, 'sine', 0.06);
      if (this.musicStep % 4 === 2) this.tone(note / 2, 0.6, 'triangle', 0.05);
      this.musicStep += 1;
    }, 340);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopMusic();
    return this.enabled;
  }
}
