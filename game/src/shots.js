// Deterministic screenshot scenes behind ?shot=start|play|end&seed=N.
// One job: play the real rules forward from a seeded RNG so each frame is
// what real play looks like — title, mid-game with a dish mid-assembly,
// and game over after orders expire.
import { GAME, STATIONS } from './config.js';
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

function cookOneIngredient(game, pantryStation, prepStation) {
  doStation(game, pantryStation);
  if (prepStation) {
    doStation(game, prepStation);
    waitSeconds(game, (prepStation.kind === 'board' ? GAME.chopSeconds : GAME.cookSeconds) + 0.4);
  }
  doStation(game, STATIONS.plate);
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

// Play scene: real orders, real cooking — end with a Nasi Goreng 2/3 on the
// plate (rice cooked + egg cooked, kecap still to come), one order on the
// board, timer running, a plate ready to be finished.
function stagePlay(game) {
  game.screen = SCREEN_PLAY;
  game.hud.hideOverlays();
  // Let the first orders arrive.
  waitSeconds(game, 3.5);
  // Cook rice, then egg, and put both on the plate.
  cookOneIngredient(game, STATIONS.pantryRice, STATIONS.stove);
  cookOneIngredient(game, STATIONS.pantryEgg, STATIONS.stove);
  // Grab the final kecap and walk it toward the plate, so the frame shows
  // the chef carrying the last ingredient with a dish mid-assembly (2/3).
  doStation(game, STATIONS.pantrySauce);
  walkTo(game, STATIONS.plate, 1.0);
  // Let the clock run a little so the order timers show pressure.
  waitSeconds(game, 2);
  game.hud.renderOrders(game.board.orders, game.plate);
  game.hud.setScore(game.score, game.coins);
  return { screen: SCREEN_PLAY, best: game.score };
}

// End scene: the chef idles while orders pile up and expire — three strikes
// and the game-over screen shows, exactly as a rushed player would lose.
function stageEnd(game) {
  game.screen = SCREEN_PLAY;
  game.hud.hideOverlays();
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
