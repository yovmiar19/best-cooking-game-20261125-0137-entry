# Sizzle & Serve: Warung Rush 🍳

[![best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/yovmiar19/best-cooking-game-20261125-0137-entry/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/yovmiar19/best-cooking-game-20261125-0137-entry/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A 3D low-poly time-management cooking game in Three.js. You run a small
Indonesian street-food warung: customers order, you sprint around the kitchen,
grab ingredients, chop, cook, plate, and serve before the timer runs out.

## How to play

- **Move:** `WASD` or arrow keys. **Interact:** `E` or mouse click.
- **Pause:** `P` or `Esc`. **Sound:** `M`.
- Take an ingredient from the back pantry (Nasi, Telur, Mie, Sayur, Ayam,
  Kecap, Tusuk, Kacang), chop it at the **Talenan** and/or cook it at the
  **Kompor**, stack it on the **Piring**, then serve it at the **Sajikan**
  window while its order is still on the board.
- **Recipes:** 🍚 Nasi Goreng (Nasi + Telur + Kecap) • 🍜 Mie Goreng
  (Mie + Telur + Sayur) • 🍢 Sate Ayam (Ayam + Tusuk + Kacang).
- Serve fast in a row for a **combo bonus**; a fast serve also pays a speed
  bonus. Each day lasts 2:30 — every new day orders arrive faster.
- **3 lives:** an expired order costs one heart. Lose all three and the
  warung closes.

## Tech

- Plain static files under `game/`, no build step, no network requests.
  Three.js is vendored as `game/vendor/three.min.js`.
- All sounds are synthesized with WebAudio — no audio files.
- Deterministic screenshot scenes: `?shot=start|play|end&seed=N` plays the
  real rules forward from a seeded RNG (title, mid-game with a dish
  mid-assembly, game over).

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
