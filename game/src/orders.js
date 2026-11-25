// Order generation and the order board queue.
// One job: spawn orders, tick their countdowns, expire them, and score serves.
import { GAME, RECIPES, RECIPE_IDS } from './config.js';
import { pick, range } from './random.js';

let orderCounter = 0;

const CUSTOMERS = ['Budi', 'Sari', 'Agus', 'Dewi', 'Rina', 'Joko', 'Maya', 'Andi'];

export function createOrder(rng, day, now, existing = []) {
  orderCounter += 1;
  const recipeId = pick(rng, RECIPE_IDS);
  const recipe = RECIPES[recipeId];
  const rush = Math.min(1, (day - 1) * 0.12);
  const timeLimit = Math.max(
    GAME.orderTimeMin,
    GAME.orderTimeBase * (1 - rush) + range(rng, -4, 6),
  );
  let customer = pick(rng, CUSTOMERS);
  // Avoid a board that reads as duplicated: same dish + same customer twice.
  while (existing.some((o) => o.recipeId === recipeId && o.customer === customer)) {
    customer = pick(rng, CUSTOMERS);
  }
  return {
    id: orderCounter,
    recipeId,
    name: recipe.name,
    emoji: recipe.emoji,
    price: recipe.price,
    steps: recipe.steps.map((s) => s.ingredient),
    timeLeft: timeLimit,
    timeLimit,
    createdAt: now,
    customer,
  };
}

export class OrderBoard {
  constructor(rng) {
    this.rng = rng;
    this.orders = [];
    this.spawnTimer = GAME.firstOrderDelay;
    this.servedCount = 0;
  }

  reset(rng) {
    this.rng = rng;
    this.orders = [];
    this.spawnTimer = GAME.firstOrderDelay;
    this.servedCount = 0;
    orderCounter = 0;
  }

  // Advance timers; returns list of expired orders (caller removes a life each).
  update(dt, day, now, onSpawn) {
    const expired = [];
    for (const order of this.orders) order.timeLeft -= dt;
    for (let i = this.orders.length - 1; i >= 0; i -= 1) {
      if (this.orders[i].timeLeft <= 0) expired.push(this.orders.splice(i, 1)[0]);
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.orders.length < GAME.orderSlots) {
      const order = createOrder(this.rng, day, now, this.orders);
      this.orders.push(order);
      if (onSpawn) onSpawn(order);
      const gap = range(this.rng, GAME.orderGapMin, GAME.orderGapMax);
      this.spawnTimer = Math.max(2.5, gap - (day - 1) * 0.6);
    }
    return expired;
  }

  // Find the oldest active order whose recipe matches the finished plate.
  findMatch(recipeId) {
    return this.orders.find((o) => o.recipeId === recipeId) ?? null;
  }

  serve(order, now) {
    const index = this.orders.indexOf(order);
    if (index === -1) return null;
    this.orders.splice(index, 1);
    this.servedCount += 1;
    const speedBonus = Math.round((order.timeLeft / order.timeLimit) * 40);
    const coins = order.price + speedBonus;
    return { coins, speedBonus, servedAt: now };
  }

  count() { return this.orders.length; }
  oldest() { return this.orders[0] ?? null; }
}
