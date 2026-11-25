// Recipes and dish assembly on the plate.
// One job: what a plate holds, which step comes next, and when a dish is done.
import { INGREDIENTS, RECIPES } from './config.js';

export class Plate {
  constructor() {
    this.reset();
  }

  reset() {
    this.recipeId = null;
    this.added = [];
    this.done = false;
  }

  // The recipe the plate is building, or null while empty.
  recipe() {
    return this.recipeId ? RECIPES[this.recipeId] : null;
  }

  // Which ingredient the plate still needs next, or null when finished/empty.
  nextNeeded() {
    const recipe = this.recipe();
    if (!recipe || this.done) return null;
    return recipe.steps[this.added.length].ingredient;
  }

  // Try to add a prepared ingredient. Returns 'ok', 'wrong', 'full' or 'empty'.
  add(ingredientId) {
    if (this.added.length === 0) {
      // First ingredient picks the recipe it belongs to (first step match).
      const match = Object.values(RECIPES).find((r) => r.steps[0].ingredient === ingredientId);
      if (!match) return 'wrong';
      this.recipeId = match.id;
    }
    const needed = this.nextNeeded();
    if (needed === null) return 'full';
    if (needed !== ingredientId) return 'wrong';
    this.added.push(ingredientId);
    if (this.added.length === RECIPES[this.recipeId].steps.length) this.done = true;
    return 'ok';
  }

  // Human-readable progress, e.g. "Nasi Goreng 2/3".
  progressText() {
    const recipe = this.recipe();
    if (!recipe) return 'Piring kosong';
    return `${recipe.name} ${this.added.length}/${recipe.steps.length}`;
  }

  // Ingredient names already on the plate, for the HUD and the 3D plate.
  addedNames() {
    return this.added.map((id) => INGREDIENTS[id].name);
  }

  isEmpty() { return this.added.length === 0; }
}

// A carried item: raw ingredient, or a prepared one after chop/cook.
export function prepareName(ingredientId, prepared) {
  const base = INGREDIENTS[ingredientId].name;
  if (!prepared) return base;
  if (INGREDIENTS[ingredientId].chop && INGREDIENTS[ingredientId].cook) return `${base} potong matang`;
  if (INGREDIENTS[ingredientId].chop) return `${base} potong`;
  if (INGREDIENTS[ingredientId].cook) return `${base} matang`;
  return base;
}

// Is this ingredient ready to go on a plate (all its prep done)?
export function isReady(ingredientId, chopped, cooked) {
  const ing = INGREDIENTS[ingredientId];
  if (ing.chop && !chopped) return false;
  if (ing.cook && !cooked) return false;
  return true;
}

// Which station prepares this ingredient next: 'board', 'stove', 'plate', or null.
export function nextStationFor(ingredientId, chopped, cooked) {
  const ing = INGREDIENTS[ingredientId];
  if (ing.chop && !chopped) return 'board';
  if (ing.cook && !cooked) return 'stove';
  return 'plate';
}
