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
    this.progressEl = document.getElementById('work-progress');
    this.progressFill = document.getElementById('work-fill');
    this.progressLabel = document.getElementById('work-label');
    this.titleEl = document.getElementById('screen-title');
    this.pauseEl = document.getElementById('screen-pause');
    this.overEl = document.getElementById('screen-over');
    this.overStats = document.getElementById('over-stats');
    this.toastTimer = null;
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
    this.livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🤍'.repeat(Math.max(0, 3 - lives));
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
      const steps = order.steps.map((id) => INGREDIENTS[id].name).join(' + ');
      card.innerHTML = `
        <div class="order-head"><span class="order-emoji">${order.emoji}</span>
        <span class="order-name">${order.name}</span>
        <span class="order-price">${order.price} koin</span></div>
        <div class="order-customer">${order.customer} • ${steps}</div>
        <div class="order-bar"><div class="order-fill" style="width:${pct}%"></div></div>
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
