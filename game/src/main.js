// Sizzle & Serve: Warung Rush — bootstrap, game loop, and the rules glue.
// One job: own the screens (title / play / pause / over), the day clock, the
// combo, and the E-key interaction that ties stations, plate and orders together.
import { COMBO_BONUS, GAME, INGREDIENTS, RECIPES, STATIONS } from './config.js';
import { makeRng, parseSeed } from './random.js';
import { SoundBank } from './audio.js';
import { Kitchen } from './kitchen.js';
import { Player } from './player.js';
import { OrderBoard } from './orders.js';
import { Plate, isReady, nextStationFor, prepareName } from './dishes.js';
import { Hud } from './hud.js';
import { stageShot } from './shots.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';

export class Game {
  constructor() {
    this.query = new URLSearchParams(window.location.search);
    this.seed = parseSeed(this.query);
    this.rng = makeRng(this.seed);
    this.sound = new SoundBank();
    this.kitchen = new Kitchen(document.getElementById('game'));
    this.player = new Player();
    this.player.bindInput();
    this.board = new OrderBoard(this.rng);
    this.plate = new Plate();
    this.hud = new Hud();
    this.screen = SCREEN_TITLE;
    this.score = 0;
    this.coins = 0;
    this.lives = GAME.startLives;
    this.day = 1;
    this.dayTimeLeft = GAME.dayLengthSeconds;
    this.combo = 0;
    this.comboTimer = 0;
    this.lastTime = performance.now();
    this.elapsed = 0;
    this.shotMode = this.query.get('shot');
    this.shotStaged = false;
    this.kitchen.shotMode = !!this.shotMode;
    this.bindUi();
    this.resetWorld();
    if (this.shotMode) {
      const staged = stageShot(this.shotMode, this);
      this.screen = staged.screen;
      this.applyScreen();
    } else {
      this.hud.showTitle();
      this.kitchen.waving = true;
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  bindUi() {
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause(false));
    document.getElementById('btn-sound').addEventListener('click', (e) => {
      this.sound.ensure();
      const on = this.sound.toggle();
      e.target.textContent = on ? '🔊 Suara: ON' : '🔇 Suara: OFF';
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (this.screen === SCREEN_TITLE || this.screen === SCREEN_OVER)) this.startGame();
      if (e.key.toLowerCase() === 'e' && this.screen === SCREEN_PLAY) this.interact();
      if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        if (this.screen === SCREEN_PLAY) this.togglePause(true);
        else if (this.screen === SCREEN_PAUSE) this.togglePause(false);
      }
      if (e.key.toLowerCase() === 'm') this.sound.toggle();
    });
    this.kitchen.renderer.domElement.addEventListener('click', () => {
      this.sound.ensure();
      if (this.screen === SCREEN_PLAY) this.interact();
    });
  }

  resetWorld() {
    this.rng = makeRng(this.seed);
    this.board.reset(this.rng);
    this.plate.reset();
    this.player.reset();
    this.score = 0;
    this.coins = 0;
    this.lives = GAME.startLives;
    this.day = 1;
    this.dayTimeLeft = GAME.dayLengthSeconds;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 1;
    this.elapsed = 0;
    this.hudTimer = 0;
    this.servedByRecipe = { nasi: 0, mie: 0, sate: 0 };
    this.speedBonusTotal = 0;
    this.kitchen.setPlateContents([]);
    this.kitchen.setCarried(null);
    this.kitchen.clearWorkTarget();
    this.kitchen.setCooking(false);
    this.kitchen.setShutter(false);
    this.hud.hideServePop();
    this.hud.setScore(0, 0);
    this.hud.setLives(this.lives);
    this.hud.setCombo(0);
    this.hud.setDayTime(this.dayTimeLeft, this.day);
    this.hud.setCarried(null);
    this.hud.renderOrders([], this.plate);
  }

  startGame() {
    this.sound.ensure();
    this.sound.startMusic();
    this.sound.click();
    this.resetWorld();
    this.kitchen.waving = false;
    this.screen = SCREEN_PLAY;
    this.applyScreen();
    this.hud.toast('Hari 1 dimulai! Ambil bahan, masak, sajikan! 🍳');
  }

  togglePause(paused) {
    if (paused && this.screen === SCREEN_PLAY) {
      this.screen = SCREEN_PAUSE;
      this.sound.click();
    } else if (!paused && this.screen === SCREEN_PAUSE) {
      this.screen = SCREEN_PLAY;
    }
    this.applyScreen();
  }

  applyScreen() {
    if (this.screen === SCREEN_TITLE) this.hud.showTitle();
    else if (this.screen === SCREEN_PAUSE) this.hud.showPause(true);
    else if (this.screen === SCREEN_OVER) { /* stats set by gameOver() */ }
    else this.hud.hideOverlays();
    if (this.screen !== SCREEN_PAUSE) this.hud.showPause(false);
    // The chef waves at the camera on the title screen.
    this.kitchen.waving = this.screen === SCREEN_TITLE;
  }

  gameOver() {
    this.screen = SCREEN_OVER;
    this.sound.stopMusic();
    this.sound.gameOver();
    this.kitchen.setCooking(false);
    this.kitchen.clearWorkTarget();
    // The warung pulls its shutter halfway down.
    this.kitchen.setShutter(true);
    const stars = this.score >= 400 ? 3 : this.score >= 200 ? 2 : 1;
    const rank = stars === 3 ? 'Juragan Warung' : stars === 2 ? 'Koki Andal' : 'Pemula Dapur';
    const starRow = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    let best = 0;
    try { best = Number(window.localStorage.getItem('warung-best-score')) || 0; } catch (e) { /* storage unavailable */ }
    const isNewBest = this.score > 0 && (this.score > best || !!this.shotMode);
    if (!this.shotMode && this.score > best) {
      try { window.localStorage.setItem('warung-best-score', String(this.score)); } catch (e) { /* ignore */ }
    }
    const recipeRows = Object.values(RECIPES).map((r) => {
      const n = this.servedByRecipe[r.id] || 0;
      return `<div class="stat-row"><span>${r.emoji} ${r.name}</span><b>${n} porsi</b></div>`;
    }).join('');
    const stats = `
      <div class="stat-stars">${starRow}</div>
      <div><span class="rank-badge">🏅 ${rank}</span></div>
      <div style="font-size:22px">Skor akhir: <b>${this.score}</b>${isNewBest ? '<span class="new-best">★ NEW BEST!</span>' : ''}</div>
      <div class="over-divider"></div>
      ${recipeRows}
      <div class="stat-row"><span>🪙 Total koin</span><b>${this.coins}</b></div>
      <div class="stat-row"><span>⚡ Bonus kecepatan</span><b>+${this.speedBonusTotal} koin</b></div>
      <div class="stat-row"><span>🔥 Kombo terbaik</span><b>x${this.bestCombo || 1}</b></div>
      <div class="stat-row"><span>📋 Pesanan tersaji</span><b>${this.board.servedCount}</b></div>
      <div class="stat-row"><span>🌅 Hari tercapai</span><b>${this.day}</b></div>
      <p class="over-tip">Tip: sajikan cepat berturut-turut untuk kombo, dan jangan biarkan pesanan kedaluwarsa!</p>`;
    this.hud.showGameOver(stats);
  }

  // The E key / click: use whatever station the chef stands by.
  interact() {
    if (this.player.working) return;
    const { station } = this.player.nearestStation();
    if (!station) { this.hud.toast('Berdiri dekat stasiun dulu!'); return; }
    const carried = this.player.carried;

    if (station.kind === 'pantry') {
      if (carried) { this.hud.toast('Tangan penuh — olah dulu bahan yang dibawa!'); return; }
      this.player.carried = { ingredient: station.ingredient, chopped: false, cooked: false };
      this.kitchen.setCarried(station.ingredient);
      this.sound.pickup();
      this.hud.setCarried(INGREDIENTS[station.ingredient].name);
      this.hud.toast(`Mengambil ${INGREDIENTS[station.ingredient].name}`);
      return;
    }

    if (station.kind === 'board' || station.kind === 'stove') {
      if (!carried) { this.hud.toast(station.kind === 'board' ? 'Bawa bahan ke talenan!' : 'Bawa bahan ke kompor!'); return; }
      const want = station.kind === 'board' ? 'board' : 'stove';
      if (nextStationFor(carried.ingredient, carried.chopped, carried.cooked) !== want) {
        this.hud.toast(`${INGREDIENTS[carried.ingredient].name} tidak perlu ${want === 'board' ? 'dipotong' : 'dimasak'} lagi`);
        return;
      }
      const duration = want === 'board' ? GAME.chopSeconds : GAME.cookSeconds;
      this.player.startWork(station, carried.ingredient, want, duration);
      this.kitchen.setWorkTarget(carried.ingredient, station);
      if (want === 'stove') { this.kitchen.setCooking(true); this.sound.sizzleStart(); }
      else { this.sound.chop(); this.kitchen.burstChop(); }
      this.hud.showWork(want === 'board' ? `Memotong ${INGREDIENTS[carried.ingredient].name}…` : `Memasak ${INGREDIENTS[carried.ingredient].name}…`, 0);
      return;
    }

    if (station.kind === 'plate') {
      if (!carried) { this.hud.toast('Bawa bahan yang sudah jadi ke piring!'); return; }
      if (!isReady(carried.ingredient, carried.chopped, carried.cooked)) {
        this.hud.toast(`${INGREDIENTS[carried.ingredient].name} masih mentah — olah dulu!`);
        this.sound.fail();
        return;
      }
      const result = this.plate.add(carried.ingredient);
      if (result === 'wrong') {
        this.hud.toast('Bahan ini tidak cocok dengan piring ini!');
        this.sound.fail();
        return;
      }
      if (result === 'full') { this.hud.toast('Piring sudah lengkap — sajikan!'); return; }
      this.player.carried = null;
      this.kitchen.setCarried(null);
      this.kitchen.setPlateContents(this.plate.added);
      this.sound.ding();
      this.hud.setCarried(null);
      if (this.plate.done) this.hud.toast(`🍽️ ${this.plate.recipe().name} siap disajikan!`);
      else this.hud.toast(`${this.plate.progressText()} — lanjutkan!`);
      return;
    }

    if (station.kind === 'serve') {
      if (!this.plate.done) {
        this.hud.toast(this.plate.isEmpty() ? 'Piring masih kosong!' : `Belum lengkap: ${this.plate.progressText()}`);
        return;
      }
      const order = this.board.findMatch(this.plate.recipeId);
      if (!order) {
        this.hud.toast('Tidak ada pesanan untuk hidangan ini — tunggu pesanan masuk!');
        this.sound.fail();
        return;
      }
      const served = this.board.serve(order, this.elapsed);
      const comboBonus = this.combo > 0 ? this.combo * COMBO_BONUS : 0;
      const total = served.coins + comboBonus;
      this.score += total;
      this.coins += total;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo || 1, this.combo);
      this.comboTimer = GAME.comboWindowSeconds;
      this.servedByRecipe[order.recipeId] = (this.servedByRecipe[order.recipeId] || 0) + 1;
      this.speedBonusTotal += served.speedBonus;
      this.plate.reset();
      this.kitchen.setPlateContents([]);
      this.sound.serve();
      this.sound.coin();
      this.hud.setScore(this.score, this.coins);
      this.hud.setCombo(this.combo);
      // Serve celebration: floating popup, gold sparkles, coins flying
      // from the serve window toward the coin counter.
      const parts = [`+${total}`];
      if (this.combo > 1) parts.push(`KOMBO x${this.combo}`);
      if (served.speedBonus > 0) parts.push('SPEED BONUS');
      this.hud.showServePop(parts.join(' · '), !!this.shotMode);
      this.kitchen.burstServe();
      this.hud.spawnCoins(this.kitchen.worldToScreen(4.6, 1.3, 2.6), !!this.shotMode);
      this.hud.toast(`✅ ${order.name} disajikan! +${total} koin${comboBonus ? ` (kombo +${comboBonus})` : ''} — ${order.customer} senang!`);
      return;
    }
  }

  // Finish a chop / cook job: mark the carried ingredient prepared.
  finishWork(job) {
    const carried = this.player.carried;
    this.kitchen.clearWorkTarget();
    this.kitchen.setCooking(false);
    this.hud.hideWork();
    if (!carried || carried.ingredient !== job.ingredient) return;
    if (job.kind === 'board') carried.chopped = true;
    if (job.kind === 'stove') carried.cooked = true;
    this.sound.ding();
    this.hud.setCarried(prepareName(carried.ingredient, true));
    this.hud.toast(`${prepareName(carried.ingredient, true)} siap!`);
  }

  loseLife(reason) {
    this.lives -= 1;
    this.combo = 0;
    this.hud.setLives(this.lives);
    this.hud.setCombo(0);
    this.sound.expired();
    this.hud.toast(reason, 3000);
    if (this.lives <= 0) this.gameOver();
  }

  update(dt) {
    if (this.screen !== SCREEN_PLAY) return;
    this.elapsed += dt;
    this.dayTimeLeft -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.hud.setCombo(0); }
    }
    if (this.dayTimeLeft <= 0) {
      this.day += 1;
      this.dayTimeLeft = GAME.dayLengthSeconds;
      this.hud.toast(`🌅 Hari ${this.day}! Pesanan datang lebih cepat — semangat!`, 3000);
      this.sound.rush();
    }
    this.player.update(dt);
    // Working jobs tick even while the chef stands still.
    if (this.player.working) {
      const job = this.player.working;
      const done = this.player.tickWork(dt);
      this.hud.showWork(
        job.kind === 'board' ? `Memotong ${INGREDIENTS[job.ingredient].name}…` : `Memasak ${INGREDIENTS[job.ingredient].name}…`,
        job.progress,
      );
      if (job.kind === 'stove') {
        // Deterministic sizzle puffs: driven by the clock, never Math.random,
        // so seeded ?shot= scenes replay identically.
        const puff = Math.floor(this.elapsed * 4) !== Math.floor((this.elapsed - dt) * 4);
        if (puff) this.sound.sizzleLoop();
      }
      if (done) this.finishWork(done);
    }
    const expired = this.board.update(dt, this.day, this.elapsed, (order) => {
      this.sound.ding();
      this.hud.toast(`📋 Pesanan baru: ${order.emoji} ${order.name} untuk ${order.customer}!`);
    });
    for (const order of expired) {
      this.loseLife(`⏰ Pesanan ${order.name} (${order.customer}) kedaluwarsa! −1 ❤️`);
      if (this.screen !== SCREEN_PLAY) break;
    }
    const { station } = this.player.nearestStation();
    this.kitchen.highlightStation(station);
    this.hud.setHint(this.player.hintFor(station));
    this.hud.setDayTime(this.dayTimeLeft, this.day);
    // The order board rebuilds DOM, so refresh it 6x a second, not per frame.
    this.hudTimer += dt;
    if (this.hudTimer >= 0.16) {
      this.hudTimer = 0;
      this.hud.renderOrders(this.board.orders, this.plate);
    }
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.kitchen.syncPlayer(this.player, dt);
    this.kitchen.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
