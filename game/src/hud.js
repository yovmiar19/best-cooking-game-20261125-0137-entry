// DOM HUD: score, timer, lives, order board, carried item, overlays.
// One job: everything drawn in HTML on top of the 3D canvas.
import { INGREDIENTS } from './config.js';

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.scoreEl = document.getElementById('score');
    this.coinsEl = document.getElementById('coins');
    this.dayEl = document.getElementById('day-time');
    this.livesEl = document.getElementById('lives');
    this.comboEl = document.getElementById('combo');
    this.ordersEl = document.getElementById('orders');
    this.carriedEl = document.getElementById('carried');
    this.hintEl = document.getElementById('hint');
    this.toastEl = document.getElementById('toast');
    this.scorePopEl = document.getElementById('score-pop');
    this.coinsLayerEl = document.getElementById('coins-layer');
    this.progressEl = document.getElementById('work-progress');
    this.progressFill = document.getElementById('work-fill');
    this.progressLabel = document.getElementById('work-label');
    this.titleEl = document.getElementById('screen-title');
    this.pauseEl = document.getElementById('screen-pause');
    this.overEl = document.getElementById('screen-over');
    this.overStats = document.getElementById('over-stats');
    this.toastTimer = null;
    this.scorePopTimer = null;
  }

  setScore(score, coins) {
    this.scoreEl.textContent = String(score);
    this.coinsEl.textContent = `${coins} koin`;
  }

  setDayTime(secondsLeft, day) {
    const s = Math.max(0, Math.ceil(secondsLeft));
    const m = Math.floor(s / 60);
    const r = s % 60;
    this.dayEl.textContent = `Hari ${day} • ${m}:${String(r).padStart(2, '0')}`;
    this.dayEl.classList.toggle('urgent', secondsLeft <= 15);
  }

  setLives(lives) {
    // Lives are chili icons: a lost life is a greyed-out chili.
    this.livesEl.innerHTML = [0, 1, 2].map((i) =>
      `<span class="life${i < lives ? '' : ' lost'}">🌶️</span>`).join('');
  }

  setCombo(combo) {
    this.comboEl.textContent = combo > 1 ? `🔥 Kombo x${combo}` : '';
    this.comboEl.classList.toggle('hot', combo >= 3);
  }

  // Rebuild the order board from the live order list.
  renderOrders(orders, plate) {
    this.ordersEl.innerHTML = '';
    if (orders.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'order-empty';
      empty.textContent = 'Belum ada pesanan — bersiap!';
      this.ordersEl.appendChild(empty);
    }
    for (const order of orders) {
      const card = document.createElement('div');
      card.className = 'order-card';
      const pct = Math.max(0, (order.timeLeft / order.timeLimit) * 100);
      const urgent = order.timeLeft <= 12;
      card.classList.toggle('urgent', urgent);
      // Countdown bar: green -> amber -> red as the order runs out.
      const fillColor = pct > 50 ? '#43a047' : pct > 25 ? '#fb8c00' : '#e53935';
      const dots = order.steps.map((id) => {
        const hex = `#${INGREDIENTS[id].color.toString(16).padStart(6, '0')}`;
        return `<span class="ing-dot" style="background:${hex}" title="${INGREDIENTS[id].name}"></span>`;
      }).join('');
      card.innerHTML = `
        <div class="order-head"><span class="order-emoji">${order.emoji}</span>
        <span class="order-name">${order.name}</span>
        <span class="order-price">${order.price} koin</span></div>
        <div class="order-customer">${order.customer}</div>
        <div class="order-ingredients">${dots}</div>
        <div class="order-bar"><div class="order-fill" style="width:${pct}%;background:${fillColor}"></div></div>
        <div class="order-time">${Math.ceil(order.timeLeft)} dtk</div>`;
      this.ordersEl.appendChild(card);
    }
    const plateLine = document.createElement('div');
    plateLine.className = 'plate-line';
    plateLine.textContent = plate.isEmpty()
      ? '🍽️ Piring: kosong'
      : `🍽️ Piring: ${plate.progressText()} — ${plate.addedNames().join(', ')}`;
    this.ordersEl.appendChild(plateLine);
  }

  setCarried(text) {
    this.carriedEl.textContent = text ? `🤲 ${text}` : '🤲 Tangan kosong';
  }

  setHint(text) {
    this.hintEl.textContent = text;
  }

  toast(text, ms = 2200) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  // Big floating serve popup ("+200 · KOMBO x3 · SPEED BONUS"). Sticky in
  // shot mode so the screenshot catches it; otherwise it fades in ~1.8 s.
  showServePop(text, sticky = false) {
    this.scorePopEl.textContent = text;
    this.scorePopEl.classList.add('show');
    clearTimeout(this.scorePopTimer);
    if (!sticky) this.scorePopTimer = setTimeout(() => this.scorePopEl.classList.remove('show'), 1800);
  }

  hideServePop() {
    this.scorePopEl.classList.remove('show');
    clearTimeout(this.scorePopTimer);
  }

  // Coins flying from the serve window toward the coin counter. In shot
  // mode they freeze mid-flight (removed after 30 s so the scene stays clean).
  spawnCoins(from, frozen = false) {
    const pill = this.coinsEl.closest('.pill');
    if (!pill || !this.coinsLayerEl) return;
    const r = pill.getBoundingClientRect();
    const to = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    for (let i = 0; i < 6; i += 1) {
      const coin = document.createElement('span');
      coin.className = 'fly-coin';
      coin.textContent = '🪙';
      const f = frozen ? 0.3 + i * 0.09 : 0;
      const x = from.x + (to.x - from.x) * f;
      const y = from.y + (to.y - from.y) * f - Math.sin(f * Math.PI) * 90;
      coin.style.left = `${x}px`;
      coin.style.top = `${y}px`;
      if (frozen) {
        // Frozen mid-flight: no flight animation, or it would drift to the
        // counter and fade to 0.15 opacity.
        coin.style.animation = 'none';
      } else {
        coin.style.setProperty('--dx', `${to.x - from.x}px`);
        coin.style.setProperty('--dy', `${to.y - from.y}px`);
        coin.style.animationDelay = `${i * 0.07}s`;
      }
      this.coinsLayerEl.appendChild(coin);
      setTimeout(() => coin.remove(), frozen ? 30000 : 1400);
    }
  }

  showWork(label, progress) {
    this.progressEl.classList.add('show');
    this.progressLabel.textContent = label;
    this.progressFill.style.width = `${Math.round(progress * 100)}%`;
  }

  hideWork() {
    this.progressEl.classList.remove('show');
  }

  showTitle() {
    this.titleEl.classList.remove('hidden');
    this.pauseEl.classList.add('hidden');
    this.overEl.classList.add('hidden');
  }

  showPause(paused) {
    this.pauseEl.classList.toggle('hidden', !paused);
  }

  showGameOver(stats) {
    this.overEl.classList.remove('hidden');
    this.titleEl.classList.add('hidden');
    this.pauseEl.classList.add('hidden');
    this.overStats.innerHTML = stats;
  }

  hideOverlays() {
    this.titleEl.classList.add('hidden');
    this.pauseEl.classList.add('hidden');
    this.overEl.classList.add('hidden');
  }
}
