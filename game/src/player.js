// Player movement and station interaction.
// One job: WASD/arrows move the chef, E (or click) uses the nearest station.
import { GAME, STATIONS, STATION_LIST } from './config.js';
import { isReady, nextStationFor } from './dishes.js';

export class Player {
  constructor() {
    this.reset();
    this.keys = new Set();
  }

  reset() {
    this.x = 0;
    this.z = 1.4;
    this.vx = 0;
    this.vz = 0;
    this.moving = false;
    this.carried = null; // { ingredient, chopped, cooked }
    this.working = null; // { stationId, ingredient, progress, duration, kind }
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  // Teleport helper used by the ?shot= autopilot.
  setPosition(x, z) {
    this.x = x;
    this.z = z;
  }

  update(dt) {
    if (this.working) return; // rooted while chopping / cooking
    let dx = 0;
    let dz = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dz -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dz += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
      this.vx = dx;
      this.vz = dz;
      this.moving = true;
      this.x += dx * GAME.playerSpeed * dt;
      this.z += dz * GAME.playerSpeed * dt;
    } else {
      this.moving = false;
      this.vx = 0;
      this.vz = 0;
    }
    const hw = GAME.kitchenWidth / 2 - 0.6;
    const hd = GAME.kitchenDepth / 2 - 0.6;
    this.x = Math.max(-hw, Math.min(hw, this.x));
    this.z = Math.max(-hd, Math.min(hd, this.z));
    // Solid counters: push the chef out of every station's footprint so
    // they walk around the kitchen instead of through the furniture.
    for (const s of STATION_LIST) {
      const dx = this.x - s.x;
      const dz = this.z - s.z;
      const dist = Math.hypot(dx, dz);
      const minDist = s.kind === 'pantry' ? 0.85 : 0.95;
      if (dist > 0.001 && dist < minDist) {
        this.x = s.x + (dx / dist) * minDist;
        this.z = s.z + (dz / dist) * minDist;
      }
    }
  }

  nearestStation() {
    let best = null;
    let bestDist = Infinity;
    for (const s of STATION_LIST) {
      const d = Math.hypot(s.x - this.x, s.z - this.z);
      if (d < bestDist) { bestDist = d; best = s; }
    }
    return bestDist <= GAME.interactRange ? { station: best, dist: bestDist } : { station: null, dist: bestDist };
  }

  // Start a timed chop/cook job. Returns the job or null.
  startWork(station, ingredient, kind, duration) {
    this.working = { stationId: station.id, ingredient, progress: 0, duration, kind };
    return this.working;
  }

  // Tick the current job; returns the finished job or null.
  tickWork(dt) {
    if (!this.working) return null;
    this.working.progress += dt / this.working.duration;
    if (this.working.progress >= 1) {
      const done = this.working;
      this.working = null;
      return done;
    }
    return null;
  }

  cancelWork() {
    this.working = null;
  }

  // Where the chef should stand to use a station (in front of it).
  // Stove and serve window stand closer (0.9) than the board and plate
  // (1.2): the board/stove pair and the plate/serve pair sit 2.4 apart, so
  // a 1.2 stand is exactly midway and E would hit the wrong station.
  standPoint(station) {
    const dz = (station.kind === 'stove' || station.kind === 'serve') ? 0.9 : 1.2;
    const sign = station.z < 0 ? 1 : -1;
    return { x: station.x, z: station.z + sign * dz };
  }

  // Hint text for the nearest station, given what is carried.
  hintFor(station) {
    if (!station) return 'WASD / panah: bergerak — E: pakai stasiun';
    if (station.kind === 'pantry') {
      return this.carried
        ? `Tangan penuh (${this.carried.ingredient}) — sajikan dulu atau letakkan di piring`
        : `E: ambil ${station.label}`;
    }
    if (station.kind === 'board') {
      if (!this.carried) return 'Bawa bahan ke talenan untuk dipotong';
      return nextStationFor(this.carried.ingredient, this.carried.chopped, this.carried.cooked) === 'board'
        ? `E: potong ${this.carried.ingredient}`
        : 'Bahan ini tidak perlu dipotong';
    }
    if (station.kind === 'stove') {
      if (!this.carried) return 'Bawa bahan ke kompor untuk dimasak';
      return nextStationFor(this.carried.ingredient, this.carried.chopped, this.carried.cooked) === 'stove'
        ? `E: masak ${this.carried.ingredient}`
        : 'Bahan ini tidak perlu dimasak';
    }
    if (station.kind === 'plate') {
      if (!this.carried) return 'Piring siap — bawa bahan yang sudah jadi';
      return isReady(this.carried.ingredient, this.carried.chopped, this.carried.cooked)
        ? `E: taruh ${this.carried.ingredient} di piring`
        : `Masih mentah — ${this.carried.ingredient} butuh diolah dulu`;
    }
    if (station.kind === 'serve') return 'E: sajikan piring yang sudah lengkap';
    return '';
  }
}

export { STATIONS };
