// Deterministic screenshot scenes behind ?shot=start|play|end&seed=N.
// One job: play the real rules forward from a seeded RNG so each frame is
// what real play looks like — title, mid-game with a dish mid-assembly,
// and game over after orders expire.
import { GAME, RECIPES, STATIONS } from './config.js';
import { nextStationFor } from './dishes.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './main.js';

const STEP = 1 / 60;

// Walk the chef toward a station, then press E, in fixed steps.
function walkTo(game, station, seconds = 2.2) {
  const target = game.player.standPoint(station);
  const steps = Math.ceil(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const dx = target.x - game.player.x;
    const dz = target.z - game.player.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.15) break;
    const sp = GAME.playerSpeed * STEP;
    game.player.x += (dx / dist) * Math.min(sp, dist);
    game.player.z += (dz / dist) * Math.min(sp, dist);
    game.player.moving = true;
    game.player.vx = dx / dist;
    game.player.vz = dz / dist;
    game.kitchen.syncPlayer(game.player, STEP);
  }
  game.player.moving = false;
}

function waitSeconds(game, seconds) {
  const steps = Math.ceil(seconds / STEP);
  for (let i = 0; i < steps; i += 1) game.update(STEP);
}

function doStation(game, station) {
  walkTo(game, station);
  game.interact();
}

const PANTRY_BY_INGREDIENT = {};
for (const s of Object.values(STATIONS)) {
  if (s.kind === 'pantry') PANTRY_BY_INGREDIENT[s.ingredient] = s;
}

// Cook one full recipe onto the plate, playing the real rules forward.
// An ingredient is prepped until ready (chicken needs board THEN stove),
// then placed on the plate.
function cookRecipe(game, recipeId) {
  const recipe = RECIPES[recipeId];
  for (const step of recipe.steps) {
    doStation(game, PANTRY_BY_INGREDIENT[step.ingredient]);
    for (let guard = 0; guard < 3; guard += 1) {
      const carried = game.player.carried;
      if (!carried) break;
      const want = nextStationFor(carried.ingredient, carried.chopped, carried.cooked);
      if (want === 'plate') break;
      const prep = want === 'board' ? STATIONS.board : STATIONS.stove;
      doStation(game, prep);
      waitSeconds(game, (want === 'board' ? GAME.chopSeconds : GAME.cookSeconds) + 0.4);
    }
    doStation(game, STATIONS.plate);
  }
}

// Start scene: a few seconds of attract-mode play behind the title overlay.
function stageStart(game) {
  game.screen = SCREEN_PLAY;
  const steps = Math.ceil(5 / STEP); // 5 seconds of attract-mode play
  for (let i = 0; i < steps; i += 1) game.update(STEP);
  game.screen = SCREEN_TITLE;
  game.hud.showTitle();
  return { screen: SCREEN_TITLE, best: 0 };
}

// Play scene: a busy mid-game moment on Day 3 — four orders on the board,
// one flashing red under 10 seconds, caught at the instant a dish is
// served (floating popup, sparkles, coins frozen mid-flight), with the
// next dish already plated 3/3 ready to serve and the following dish's
// first ingredient in the chef's hand. Played forward through the real
// rules; the combo is staged at x2 just before the serve so the popup
// reads KOMBO x3.
function stagePlay(game) {
  game.screen = SCREEN_PLAY;
  game.hud.hideOverlays();
  game.day = 3;
  game.dayTimeLeft = 120;
  // Let the first orders arrive.
  waitSeconds(game, 3.5);
  // Cook the oldest order's dish, then serve it at the serve window.
  const first = game.board.oldest();
  if (first) {
    cookRecipe(game, first.recipeId);
    // Staging: as if two quick serves just happened — the serve below
    // becomes KOMBO x3 in the popup.
    game.combo = 2;
    game.comboTimer = GAME.comboWindowSeconds;
    doStation(game, STATIONS.serve);
  }
  // Cook the next dish fully onto the plate (3/3, ready to serve), then
  // grab the first ingredient of the following dish and hold it.
  const next = game.board.oldest();
  if (next && game.screen === SCREEN_PLAY) {
    cookRecipe(game, next.recipeId);
    const following = game.board.oldest();
    if (following) {
      const firstStep = RECIPES[following.recipeId].steps[0];
      doStation(game, PANTRY_BY_INGREDIENT[firstStep.ingredient]);
      // Walk back toward the kitchen centre so the chef faces the camera and
      // the frame stays centred on the whole warung (stove, talenan, plate
      // and serve window all in view), still carrying the ingredient.
      walkTo(game, { x: 0, z: 0.5, kind: 'center' }, 1.5);
    }
  }
  // Let the clock run until the oldest order is flashing red (< 10 s left),
  // but stop well before it expires.
  for (let i = 0; i < 40; i += 1) {
    const oldest = game.board.oldest();
    if (!oldest || oldest.timeLeft <= 9) break;
    waitSeconds(game, 1);
  }
  // The serve combo decayed while the next dish was being prepped; restore
  // it so the HUD pill matches the frozen serve popup (KOMBO x3).
  game.combo = 3;
  game.comboTimer = 0;
  game.hud.setCombo(3);
  game.hud.renderOrders(game.board.orders, game.plate);
  game.hud.setScore(game.score, game.coins);
  return { screen: SCREEN_PLAY, best: game.score };
}

// End scene: serve two dishes first (so the results card has real numbers),
// then let orders expire until the warung closes — exactly as a rushed
// player would lose.
function stageEnd(game) {
  game.screen = SCREEN_PLAY;
  game.hud.hideOverlays();
  waitSeconds(game, 3.5);
  for (let n = 0; n < 2; n += 1) {
    const order = game.board.oldest();
    if (!order || game.screen !== SCREEN_PLAY) break;
    cookRecipe(game, order.recipeId);
    doStation(game, STATIONS.serve);
    waitSeconds(game, 1);
  }
  const limit = 600;
  for (let i = 0; i < limit / STEP; i += 1) {
    game.update(STEP);
    if (game.screen === SCREEN_OVER) break;
  }
  return { screen: game.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY, best: game.score };
}

export function stageShot(name, game) {
  game.resetWorld();
  if (name === 'play') return stagePlay(game);
  if (name === 'end') return stageEnd(game);
  return stageStart(game);
}
